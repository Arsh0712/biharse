import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/security';
import { serializeProduct } from '@/lib/commerce';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ slugs: [] });
  const items = await db.wishlistItem.findMany({ where: { customerId: user.id }, include: { product: { include: { category: { select: { slug: true, nameEn: true, nameHi: true } } } } }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ slugs: items.map((i) => i.product.slug), products: items.map((i) => serializeProduct(i.product)) });
}

/** PUT — replace the signed-in customer's wishlist with the client's full slug list (diff upsert/delete). */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { slugs?: unknown };
  if (!Array.isArray(b.slugs)) return NextResponse.json({ error: 'slugs array required' }, { status: 400 });

  const wanted = Array.from(new Set(b.slugs.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 200)));
  const products = wanted.length
    ? await db.product.findMany({ where: { slug: { in: wanted } }, select: { id: true, slug: true } })
    : [];
  const validIds = products.map((p) => p.id);

  await db.$transaction(async (tx) => {
    const current = await tx.wishlistItem.findMany({ where: { customerId: user.id }, select: { id: true, productId: true } });
    const keep = new Set(validIds);
    const toDelete = current.filter((i) => !keep.has(i.productId)).map((i) => i.id);
    if (toDelete.length > 0) {
      await tx.wishlistItem.deleteMany({ where: { id: { in: toDelete } } });
    }
    const existing = new Set(current.map((i) => i.productId));
    const toAdd = validIds.filter((id) => !existing.has(id));
    if (toAdd.length > 0) {
      await tx.wishlistItem.createMany({ data: toAdd.map((productId) => ({ customerId: user.id, productId })) });
    }
  });

  return NextResponse.json({ ok: true, slugs: products.map((p) => p.slug) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  const product = await db.product.findUnique({ where: { slug } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const existing = await db.wishlistItem.findUnique({ where: { customerId_productId: { customerId: user.id, productId: product.id } } });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, inWishlist: false });
  }
  await db.wishlistItem.create({ data: { customerId: user.id, productId: product.id } });
  return NextResponse.json({ ok: true, inWishlist: true });
}
