// Commerce helpers — serialization, totals, coupons, order numbers
import { db } from './db';
import type { Product } from './types';

/** Product DTO — extends the shared Product type with allergen fields (PDP compliance block). */
export type ProductDto = Product & { allergensEn: string; allergensHi: string };

type DbProduct = {
  id: string; slug: string; nameEn: string; nameHi: string; taglineEn: string; taglineHi: string;
  storyEn: string; storyHi: string; ingredientsEn: string; ingredientsHi: string;
  allergensEn: string; allergensHi: string;
  storageEn: string; storageHi: string; shelfLifeDays: number;
  mrp: number; price: number; gstRate: number; hsn: string; stock: number; lowStockAt: number;
  isFeatured: boolean; isDemo: boolean; batchDate: string;
  imagesJson: string; variantsJson: string; faqJson: string; nutritionJson: string;
  seoTitle: string; seoDesc: string; rating: number; reviewCount: number;
  category: { slug: string; nameEn: string; nameHi: string };
};

export function serializeProduct(p: DbProduct): ProductDto {
  const safe = <T,>(json: string, fallback: T): T => {
    try { return JSON.parse(json) as T; } catch { return fallback; }
  };
  return {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameHi: p.nameHi,
    taglineEn: p.taglineEn,
    taglineHi: p.taglineHi,
    storyEn: p.storyEn,
    storyHi: p.storyHi,
    ingredientsEn: p.ingredientsEn,
    ingredientsHi: p.ingredientsHi,
    allergensEn: p.allergensEn,
    allergensHi: p.allergensHi,
    storageEn: p.storageEn,
    storageHi: p.storageHi,
    shelfLifeDays: p.shelfLifeDays,
    categorySlug: p.category?.slug ?? '',
    categoryNameEn: p.category?.nameEn ?? '',
    categoryNameHi: p.category?.nameHi ?? '',
    mrp: p.mrp,
    price: p.price,
    gstRate: p.gstRate,
    hsn: p.hsn,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    isFeatured: p.isFeatured,
    isDemo: p.isDemo,
    batchDate: p.batchDate,
    images: safe<string[]>(p.imagesJson, []),
    variants: safe<{ label: string; weightG: number; priceDelta: number }[]>(p.variantsJson, []),
    faq: safe<{ qEn: string; qHi: string; aEn: string; aHi: string }[]>(p.faqJson, []),
    nutrition: safe<{ label: string; per100g: string }[]>(p.nutritionJson, []),
    seoTitle: p.seoTitle,
    seoDesc: p.seoDesc,
    rating: p.rating,
    reviewCount: p.reviewCount,
  };
}

export async function getSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await db.siteSetting.findMany();
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try { map[r.key] = JSON.parse(r.valueJson); } catch { map[r.key] = r.valueJson; }
  }
  return map;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.valueJson) as T; } catch { return fallback; }
}

export function genOrderNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BS-${yy}${mm}-${rand}`;
}

export interface TotalsInput {
  lines: { slug: string; variantLabel: string; qty: number }[];
  couponCode?: string;
}
export interface TotalsResult {
  ok: boolean;
  error?: string;
  lines: { slug: string; nameEn: string; variantLabel: string; weightG: number; unitPrice: number; mrp: number; qty: number; lineTotal: number; image: string; productId: string }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string;
}

/** Server-side recomputation — never trusts client prices. */
export async function computeTotals(input: TotalsInput, shippingCfg: { freeAbovePaise: number; flatPaise: number }): Promise<TotalsResult> {
  if (!input.lines?.length) return { ok: false, error: 'Cart is empty', lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0, couponCode: '' };

  const slugs = [...new Set(input.lines.map((l) => l.slug))];
  const products = await db.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    include: { category: { select: { slug: true } } },
  });
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

  const lines: TotalsResult['lines'] = [];
  for (const l of input.lines) {
    const p = bySlug[l.slug];
    if (!p) return { ok: false, error: `Product unavailable: ${l.slug}`, lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0, couponCode: '' };
    const variants = (() => { try { return JSON.parse(p.variantsJson) as { label: string; weightG: number; priceDelta: number }[]; } catch { return []; } })();
    const v = variants.find((x) => x.label === l.variantLabel) || variants[0];
    const unitPrice = p.price + (v?.priceDelta ?? 0);
    const qty = Math.max(1, Math.min(20, Math.floor(l.qty)));
    if (p.stock < qty) return { ok: false, error: `Only ${p.stock} left of ${p.nameEn}`, lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0, couponCode: '' };
    lines.push({
      slug: p.slug,
      nameEn: p.nameEn,
      variantLabel: v?.label ?? '',
      weightG: v?.weightG ?? 0,
      unitPrice,
      mrp: p.mrp,
      qty,
      lineTotal: unitPrice * qty,
      image: (() => { try { return (JSON.parse(p.imagesJson) as string[])[0] ?? ''; } catch { return ''; } })(),
      productId: p.id,
    });
  }

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);

  // coupon
  let discount = 0;
  let couponCode = '';
  const code = (input.couponCode || '').trim().toUpperCase();
  if (code) {
    const c = await db.coupon.findUnique({ where: { code } });
    if (!c || !c.active || (c.expiresAt && c.expiresAt < new Date())) {
      return { ok: false, error: 'Coupon is invalid or expired', lines: [], subtotal, discount: 0, shipping: 0, total: 0, couponCode: '' };
    }
    if (subtotal < c.minSubtotal) {
      return { ok: false, error: `Coupon needs a minimum order of ₹${(c.minSubtotal / 100).toLocaleString('en-IN')}`, lines: [], subtotal, discount: 0, shipping: 0, total: 0, couponCode: '' };
    }
    discount = c.type === 'PERCENT' ? Math.floor((subtotal * c.value) / 100) : c.value;
    if (c.maxDiscount > 0) discount = Math.min(discount, c.maxDiscount);
    discount = Math.min(discount, subtotal);
    couponCode = c.code;
  }

  const shipping = subtotal - discount >= shippingCfg.freeAbovePaise ? 0 : shippingCfg.flatPaise;
  const total = Math.max(0, subtotal - discount + shipping);
  return { ok: true, lines, subtotal, discount, shipping, total, couponCode };
}
