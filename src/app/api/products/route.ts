import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbSeeded } from '@/lib/db';
import { serializeProduct } from '@/lib/commerce';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await ensureDbSeeded();
  const sp = req.nextUrl.searchParams;
  const category = sp.get('category') || '';
  const q = (sp.get('q') || '').trim();
  const sort = sp.get('sort') || 'featured';
  const page = Math.max(1, Number(sp.get('page') || 1));
  const perPage = 12;
  const slugs = sp.get('slugs'); // comma-separated (wishlist / recently-viewed hydration)

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') {
    const cat = await db.category.findUnique({ where: { slug: category } });
    if (cat) where.categoryId = cat.id;
  }
  if (slugs) {
    const list = slugs.split(',').filter(Boolean);
    where.slug = { in: list };
  }
  if (q) {
    where.OR = [
      { nameEn: { contains: q } },
      { nameHi: { contains: q } },
      { taglineEn: { contains: q } },
      { storyEn: { contains: q } },
    ];
  }

  const orderBy =
    sort === 'price-asc' ? [{ price: 'asc' as const }] :
    sort === 'price-desc' ? [{ price: 'desc' as const }] :
    sort === 'rating' ? [{ rating: 'desc' as const }, { reviewCount: 'desc' as const }] :
    sort === 'newest' ? [{ createdAt: 'desc' as const }] :
    [{ isFeatured: 'desc' as const }, { createdAt: 'asc' as const }];

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage, include: { category: { select: { slug: true, nameEn: true, nameHi: true } } } }),
  ]);

  return NextResponse.json({
    products: products.map(serializeProduct),
    total,
    page,
    perPage,
    hasMore: page * perPage < total,
  });
}
