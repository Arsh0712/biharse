import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit, sanitizeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'category';
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const taken = await db.category.findMany({ where: { slug: { startsWith: base } }, select: { slug: true, id: true } });
  const others = new Set(taken.filter((t) => t.id !== excludeId).map((t) => t.slug));
  if (!others.has(base)) return base;
  for (let i = 2; i < 200; i++) if (!others.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? sanitizeText(v.trim().slice(0, max)) : '');

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['products']);
  if (error) return error;
  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ categories: categories.map((c) => ({ ...c, productCount: c._count.products })) });
}

interface CategoryBody {
  id?: string;
  nameEn?: string; nameHi?: string;
  descEn?: string; descHi?: string;
  sortOrder?: number;
  isActive?: boolean;
  order?: string[]; // reorder array of ids
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;
  const b = (await req.json().catch(() => ({}))) as CategoryBody;
  const nameEn = str(b.nameEn, 80);
  if (!nameEn) return NextResponse.json({ error: 'English name is required' }, { status: 400 });

  const slug = await uniqueSlug(slugify(nameEn));
  const created = await db.category.create({
    data: {
      slug,
      nameEn,
      nameHi: str(b.nameHi, 80) || nameEn,
      descEn: str(b.descEn, 500),
      descHi: str(b.descHi, 500),
      sortOrder: Math.max(0, Math.round(Number(b.sortOrder)) || 0),
      isActive: b.isActive === undefined ? true : Boolean(b.isActive),
    },
  });
  await audit(user.email, 'category.create', { slug: created.slug });
  return NextResponse.json({ category: created }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;
  const b = (await req.json().catch(() => ({}))) as CategoryBody;

  // bulk reorder: { order: [id, id, ...] } → sortOrder = index
  if (Array.isArray(b.order) && b.order.length > 0) {
    await Promise.all(b.order.slice(0, 100).map((id, i) => db.category.update({ where: { id }, data: { sortOrder: i } }).catch(() => null)));
    await audit(user.email, 'category.reorder', { count: b.order.length });
    return NextResponse.json({ ok: true });
  }

  if (!b.id) return NextResponse.json({ error: 'Category id required' }, { status: 400 });
  const existing = await db.category.findUnique({ where: { id: b.id } });
  if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (b.nameEn !== undefined) { const v = str(b.nameEn, 80); if (v) data.nameEn = v; }
  if (b.nameHi !== undefined) data.nameHi = str(b.nameHi, 80);
  if (b.descEn !== undefined) data.descEn = str(b.descEn, 500);
  if (b.descHi !== undefined) data.descHi = str(b.descHi, 500);
  if (b.sortOrder !== undefined) data.sortOrder = Math.max(0, Math.round(Number(b.sortOrder)) || 0);
  if (typeof b.isActive === 'boolean') data.isActive = b.isActive;

  const updated = await db.category.update({ where: { id: existing.id }, data });
  await audit(user.email, 'category.update', { slug: updated.slug, fields: Object.keys(data) });
  return NextResponse.json({ category: updated });
}

export async function DELETE(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Category id required' }, { status: 400 });

  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  if (category._count.products > 0) {
    return NextResponse.json({ error: `Category has ${category._count.products} product(s) — move them first`, products: category._count.products }, { status: 409 });
  }

  await db.category.delete({ where: { id } });
  await audit(user.email, 'category.delete', { slug: category.slug });
  return NextResponse.json({ ok: true });
}
