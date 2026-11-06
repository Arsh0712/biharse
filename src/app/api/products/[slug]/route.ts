import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbSeeded } from '@/lib/db';
import { serializeProduct } from '@/lib/commerce';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await ensureDbSeeded();
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    include: { category: { select: { slug: true, nameEn: true, nameHi: true } } },
  });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const reviews = await db.review.findMany({
    where: { productId: product.id, approved: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  // related: same category, exclude self
  const related = await db.product.findMany({
    where: { categoryId: product.categoryId, isActive: true, slug: { not: product.slug } },
    take: 4,
    include: { category: { select: { slug: true, nameEn: true, nameHi: true } } },
  });
  if (related.length < 4) {
    const extra = await db.product.findMany({
      where: { isFeatured: true, isActive: true, slug: { notIn: [product.slug, ...related.map((r) => r.slug)] } },
      take: 4 - related.length,
      include: { category: { select: { slug: true, nameEn: true, nameHi: true } } },
    });
    related.push(...extra);
  }

  return NextResponse.json({
    product: serializeProduct(product),
    reviews,
    related: related.map(serializeProduct),
  });
}
