import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireStaff, audit, sanitizeText } from '@/lib/security';
import { serializeProduct } from '@/lib/commerce';

export const dynamic = 'force-dynamic';

/* ── helpers ─────────────────────────────────────────────────────────── */


function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product';
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const taken = await db.product.findMany({ where: { slug: { startsWith: base } }, select: { slug: true, id: true } });
  const others = new Set(taken.filter((t) => t.id !== excludeId).map((t) => t.slug));
  if (!others.has(base)) return base;
  for (let i = 2; i < 200; i++) if (!others.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

function asInt(v: unknown, fallback = 0): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function asStr(v: unknown, max: number): string {
  return typeof v === 'string' ? sanitizeText(v.trim().slice(0, max)) : '';
}

/** shape-check variantsJson: [{label, weightG, priceDelta}] */
function cleanVariants(v: unknown): { label: string; weightG: number; priceDelta: number }[] | null {
  if (!Array.isArray(v)) return null;
  const out: { label: string; weightG: number; priceDelta: number }[] = [];
  for (const row of v) {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const label = asStr(r.label, 60);
    if (!label) return null;
    const weightG = Math.round(Number(r.weightG));
    const priceDelta = Math.round(Number(r.priceDelta));
    if (!Number.isFinite(weightG) || weightG < 0 || !Number.isFinite(priceDelta) || priceDelta < 0) return null;
    out.push({ label, weightG, priceDelta });
  }
  return out;
}

/** shape-check faqJson: [{qEn,qHi,aEn,aHi}] */
function cleanFaq(v: unknown): { qEn: string; qHi: string; aEn: string; aHi: string }[] | null {
  if (!Array.isArray(v)) return null;
  const out: { qEn: string; qHi: string; aEn: string; aHi: string }[] = [];
  for (const row of v) {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const qEn = asStr(r.qEn, 300);
    const aEn = asStr(r.aEn, 800);
    if (!qEn || !aEn) return null;
    out.push({ qEn, qHi: asStr(r.qHi, 300), aEn, aHi: asStr(r.aHi, 800) });
  }
  return out;
}

/** shape-check nutritionJson: [{label, per100g}] */
function cleanNutrition(v: unknown): { label: string; per100g: string }[] | null {
  if (!Array.isArray(v)) return null;
  const out: { label: string; per100g: string }[] = [];
  for (const row of v) {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const label = asStr(r.label, 80);
    const per100g = asStr(r.per100g, 60);
    if (!label || !per100g) return null;
    out.push({ label, per100g });
  }
  return out;
}

/** imagesJson: string[] of site-served paths */
function cleanImages(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const s of v) {
    if (typeof s !== 'string') return null;
    if (s.startsWith('/img/') || s.startsWith('/api/media/') || s.startsWith('/brand/')) out.push(s.slice(0, 300));
    else if (s === '') continue;
    else return null;
  }
  return out.slice(0, 8);
}


/* ── GET: list with filters + pagination ─────────────────────────────── */

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['products']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim();
  const category = (sp.get('category') || '').trim();
  const status = (sp.get('status') || 'all').trim();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get('perPage')) || 50));

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ nameEn: { contains: q } }, { nameHi: { contains: q } }, { slug: { contains: q } }];
  if (category && category !== 'all') where.category = { slug: category };
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (status === 'featured') where.isFeatured = true;
  if (status === 'demo') where.isDemo = true;
  if (status === 'low') where.stock = { lte: db.product.fields.lowStockAt };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: { select: { slug: true, nameEn: true, nameHi: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({
    products: rows.map((p) => ({ ...serializeProduct(p), isActive: p.isActive })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
  });
}

/* ── POST: create ────────────────────────────────────────────────────── */

interface ProductBody {
  nameEn?: string; nameHi?: string;
  taglineEn?: string; taglineHi?: string;
  storyEn?: string; storyHi?: string;
  ingredientsEn?: string; ingredientsHi?: string;
  allergensEn?: string; allergensHi?: string;
  storageEn?: string; storageHi?: string;
  shelfLifeDays?: number;
  categorySlug?: string;
  mrp?: number; price?: number;
  gstRate?: number; hsn?: string;
  stock?: number; lowStockAt?: number;
  isActive?: boolean; isFeatured?: boolean; isDemo?: boolean;
  batchDate?: string;
  images?: unknown; variants?: unknown; faq?: unknown; nutrition?: unknown;
  seoTitle?: string; seoDesc?: string;
}

function buildData(b: ProductBody, categoryId: string): { data: Record<string, unknown> } | { error: string } {
  const price = asInt(b.price, -1);
  const mrp = asInt(b.mrp, -1);
  if (price < 0 || mrp < 0) return { error: 'Price and MRP must be non-negative amounts' };
  if (price > mrp) return { error: 'Sale price cannot exceed MRP' };

  const variants = b.variants === undefined ? [] : cleanVariants(b.variants);
  if (variants === null) return { error: 'Invalid variant rows (label required, weight/delta non-negative)' };
  const faq = b.faq === undefined ? [] : cleanFaq(b.faq);
  if (faq === null) return { error: 'Invalid FAQ rows (question and answer required)' };
  const nutrition = b.nutrition === undefined ? [] : cleanNutrition(b.nutrition);
  if (nutrition === null) return { error: 'Invalid nutrition rows (label and per-100g value required)' };
  const images = b.images === undefined ? [] : cleanImages(b.images);
  if (images === null) return { error: 'Invalid image list (use uploaded or library images)' };

  return {
    data: {
      nameEn: asStr(b.nameEn, 120),
      nameHi: asStr(b.nameHi, 120),
      taglineEn: asStr(b.taglineEn, 200),
      taglineHi: asStr(b.taglineHi, 200),
      storyEn: asStr(b.storyEn, 4000),
      storyHi: asStr(b.storyHi, 4000),
      ingredientsEn: asStr(b.ingredientsEn, 2000),
      ingredientsHi: asStr(b.ingredientsHi, 2000),
      allergensEn: asStr(b.allergensEn, 500),
      allergensHi: asStr(b.allergensHi, 500),
      storageEn: asStr(b.storageEn, 500),
      storageHi: asStr(b.storageHi, 500),
      shelfLifeDays: Math.min(3650, Math.max(1, asInt(b.shelfLifeDays, 30))),
      categoryId,
      mrp,
      price,
      gstRate: Math.min(28, Math.max(0, asInt(b.gstRate, 5))),
      hsn: asStr(b.hsn, 12) || '1905',
      stock: asInt(b.stock, 0),
      lowStockAt: Math.max(0, asInt(b.lowStockAt, 12)),
      isFeatured: Boolean(b.isFeatured),
      isDemo: Boolean(b.isDemo),
      isActive: b.isActive === undefined ? true : Boolean(b.isActive),
      batchDate: asStr(b.batchDate, 40),
      imagesJson: JSON.stringify(images),
      variantsJson: JSON.stringify(variants),
      faqJson: JSON.stringify(faq),
      nutritionJson: JSON.stringify(nutrition),
      seoTitle: asStr(b.seoTitle, 200),
      seoDesc: asStr(b.seoDesc, 300),
    },
  };
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['products']);
  if (error) return error;

  const b = (await req.json().catch(() => ({}))) as ProductBody;
  const nameEn = asStr(b.nameEn, 120);
  if (!nameEn) return NextResponse.json({ error: 'English name is required' }, { status: 400 });

  const cat = await db.category.findUnique({ where: { slug: asStr(b.categorySlug, 80) } });
  if (!cat) return NextResponse.json({ error: 'Pick a valid category' }, { status: 400 });

  const built = buildData(b, cat.id);
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const slug = await uniqueSlug(slugify(nameEn));
  const created = await db.product.create({
    data: { ...built.data, slug } as Prisma.ProductUncheckedCreateInput,
    include: { category: { select: { slug: true, nameEn: true, nameHi: true } } },
  });
  await audit(user.email, 'product.create', { slug: created.slug, nameEn });
  return NextResponse.json({ product: { ...serializeProduct(created), isActive: created.isActive } }, { status: 201 });
}

/* ── PATCH: update by id (or legacy slug) ────────────────────────────── */

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['products']);
  if (error) return error;

  const b = (await req.json().catch(() => ({}))) as ProductBody & { id?: string; slug?: string };
  const existing = await db.product.findUnique({ where: b.id ? { id: b.id } : { slug: asStr(b.slug, 80) } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (b.nameEn !== undefined) { const v = asStr(b.nameEn, 120); if (v) data.nameEn = v; }
  if (b.nameHi !== undefined) data.nameHi = asStr(b.nameHi, 120);
  if (b.taglineEn !== undefined) data.taglineEn = asStr(b.taglineEn, 200);
  if (b.taglineHi !== undefined) data.taglineHi = asStr(b.taglineHi, 200);
  if (b.storyEn !== undefined) data.storyEn = asStr(b.storyEn, 4000);
  if (b.storyHi !== undefined) data.storyHi = asStr(b.storyHi, 4000);
  if (b.ingredientsEn !== undefined) data.ingredientsEn = asStr(b.ingredientsEn, 2000);
  if (b.ingredientsHi !== undefined) data.ingredientsHi = asStr(b.ingredientsHi, 2000);
  if (b.allergensEn !== undefined) data.allergensEn = asStr(b.allergensEn, 500);
  if (b.allergensHi !== undefined) data.allergensHi = asStr(b.allergensHi, 500);
  if (b.storageEn !== undefined) data.storageEn = asStr(b.storageEn, 500);
  if (b.storageHi !== undefined) data.storageHi = asStr(b.storageHi, 500);
  if (b.seoTitle !== undefined) data.seoTitle = asStr(b.seoTitle, 200);
  if (b.seoDesc !== undefined) data.seoDesc = asStr(b.seoDesc, 300);
  if (b.shelfLifeDays !== undefined) data.shelfLifeDays = Math.min(3650, Math.max(1, asInt(b.shelfLifeDays, 30)));
  if (b.batchDate !== undefined) data.batchDate = asStr(b.batchDate, 40);
  if (b.gstRate !== undefined) data.gstRate = Math.min(28, Math.max(0, asInt(b.gstRate, 5)));
  if (b.hsn !== undefined) data.hsn = asStr(b.hsn, 12) || '1905';
  if (b.stock !== undefined) data.stock = asInt(b.stock, existing.stock);
  if (b.lowStockAt !== undefined) data.lowStockAt = Math.max(0, asInt(b.lowStockAt, existing.lowStockAt));
  if (typeof b.isActive === 'boolean') data.isActive = b.isActive;
  if (typeof b.isFeatured === 'boolean') data.isFeatured = b.isFeatured;
  if (typeof b.isDemo === 'boolean') data.isDemo = b.isDemo;

  if (b.price !== undefined || b.mrp !== undefined) {
    const price = b.price !== undefined ? asInt(b.price, -1) : existing.price;
    const mrp = b.mrp !== undefined ? asInt(b.mrp, -1) : existing.mrp;
    if (price < 0 || mrp < 0) return NextResponse.json({ error: 'Price and MRP must be non-negative' }, { status: 400 });
    if (price > mrp) return NextResponse.json({ error: 'Sale price cannot exceed MRP' }, { status: 400 });
    data.price = price;
    data.mrp = mrp;
  }

  if (b.categorySlug !== undefined) {
    const cat = await db.category.findUnique({ where: { slug: asStr(b.categorySlug, 80) } });
    if (!cat) return NextResponse.json({ error: 'Pick a valid category' }, { status: 400 });
    data.categoryId = cat.id;
  }

  if (b.variants !== undefined) {
    const v = cleanVariants(b.variants);
    if (v === null) return NextResponse.json({ error: 'Invalid variant rows' }, { status: 400 });
    data.variantsJson = JSON.stringify(v);
  }
  if (b.faq !== undefined) {
    const v = cleanFaq(b.faq);
    if (v === null) return NextResponse.json({ error: 'Invalid FAQ rows' }, { status: 400 });
    data.faqJson = JSON.stringify(v);
  }
  if (b.nutrition !== undefined) {
    const v = cleanNutrition(b.nutrition);
    if (v === null) return NextResponse.json({ error: 'Invalid nutrition rows' }, { status: 400 });
    data.nutritionJson = JSON.stringify(v);
  }
  if (b.images !== undefined) {
    const v = cleanImages(b.images);
    if (v === null) return NextResponse.json({ error: 'Invalid image list' }, { status: 400 });
    data.imagesJson = JSON.stringify(v);
  }

  const updated = await db.product.update({
    where: { id: existing.id },
    data,
    include: { category: { select: { slug: true, nameEn: true, nameHi: true } } },
  });
  await audit(user.email, 'product.update', { slug: updated.slug, fields: Object.keys(data) });
  return NextResponse.json({ product: { ...serializeProduct(updated), isActive: updated.isActive } });
}

/* ── DELETE: soft when referenced by orders, hard otherwise ──────────── */

export async function DELETE(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['products']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const id = sp.get('id') || '';
  const mode = sp.get('mode') || 'auto'; // auto | hard
  if (!id) return NextResponse.json({ error: 'Product id required' }, { status: 400 });

  const product = await db.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const orderItems = await db.orderItem.count({ where: { productId: id } });

  if (orderItems > 0 && mode === 'hard') {
    return NextResponse.json({ error: `Product is referenced by ${orderItems} order line(s); only a soft delete (hide) is possible`, orderItems }, { status: 409 });
  }

  if (orderItems > 0) {
    const updated = await db.product.update({ where: { id }, data: { isActive: false } });
    await audit(user.email, 'product.softDelete', { slug: product.slug, orderItems });
    return NextResponse.json({ ok: true, soft: true, orderItems, isActive: updated.isActive });
  }

  await db.product.delete({ where: { id } });
  await audit(user.email, 'product.delete', { slug: product.slug });
  return NextResponse.json({ ok: true, hard: true });
}
