import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, rateLimitGuard, str, sanitizeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Featured reviews across products (homepage testimonials). Approved only, newest first. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const featured = sp.get('featured');
  if (!featured) return NextResponse.json({ error: 'Missing featured parameter' }, { status: 400 });

  const take = Math.max(1, Math.min(24, Number(featured) || 8));
  const reviews = await db.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    take,
    include: { product: { select: { slug: true, nameEn: true, nameHi: true } } },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      approved: r.approved,
      createdAt: r.createdAt,
      productSlug: r.product?.slug ?? '',
      productNameEn: r.product?.nameEn ?? '',
      productNameHi: r.product?.nameHi ?? '',
    })),
  });
}

/** Submit a review. Verified-buyer reviews auto-approve; others wait for admin moderation. */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'reviews', 5, 60 * 60 * 1000);
  if (limited) return limited;

  const b = (await req.json().catch(() => ({}))) as Record<string, string | number>;
  const slug = str(b.slug, 120);
  const rating = Math.max(1, Math.min(5, Number(b.rating) || 0));
  const body = sanitizeText(str(b.body, 1500));
  const title = sanitizeText(str(b.title, 120));

  if (!slug || !rating || !body) return NextResponse.json({ error: 'Product, rating and review text required' }, { status: 400 });

  const product = await db.product.findUnique({ where: { slug } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const user = await getSessionUser(req);

  // verified buyer: delivered order containing this product with matching email
  let verified = false;
  if (user) {
    const delivered = await db.order.findFirst({
      where: {
        email: user.email,
        status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
        items: { some: { slug } },
      },
    });
    verified = Boolean(delivered);
  }

  const review = await db.review.create({
    data: {
      productId: product.id,
      customerId: user?.id ?? null,
      name: sanitizeText(str(b.name, 80)) || user?.name || 'BiharSe Guest',
      city: sanitizeText(str(b.city, 60)),
      rating,
      title,
      body,
      verified,
      approved: verified,
    },
  });

  return NextResponse.json({ ok: true, review, moderated: !verified });
}
