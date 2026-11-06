import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit, sanitizeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

const CODE_RE = /^[A-Z0-9_-]{3,24}$/;

function asInt(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validateFields(b: { type?: string; value?: number; minSubtotal?: number; maxDiscount?: number; expiresAt?: string | null }): string | null {
  const type = b.type === 'FLAT' ? 'FLAT' : 'PERCENT';
  const value = asInt(b.value);
  if (value === null || value < 1) return 'Value must be at least 1';
  if (type === 'PERCENT' && value > 99) return 'Percent discounts are capped at 99';
  const minSubtotal = asInt(b.minSubtotal ?? 0);
  if (minSubtotal === null) return 'Minimum subtotal must be non-negative';
  const maxDiscount = asInt(b.maxDiscount ?? 0);
  if (maxDiscount === null) return 'Max discount must be non-negative';
  if (b.expiresAt) {
    const d = new Date(b.expiresAt);
    if (Number.isNaN(d.getTime())) return 'Invalid expiry date';
    if (d.getTime() < Date.now()) return 'Expiry must be in the future';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;
  const coupons = await db.coupon.findMany({ orderBy: [{ active: 'desc' }, { code: 'asc' }] });
  return NextResponse.json({ coupons });
}

interface CouponBody {
  id?: string;
  code?: string;
  type?: 'PERCENT' | 'FLAT';
  value?: number;
  minSubtotal?: number;
  maxDiscount?: number;
  active?: boolean;
  expiresAt?: string | null;
  note?: string;
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;
  const b = (await req.json().catch(() => ({}))) as CouponBody;

  const code = (b.code || '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return NextResponse.json({ error: 'Code must be 3–24 letters/numbers (- and _ allowed)' }, { status: 400 });
  const dup = await db.coupon.findUnique({ where: { code } });
  if (dup) return NextResponse.json({ error: `Coupon ${code} already exists` }, { status: 409 });

  const invalid = validateFields(b);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const created = await db.coupon.create({
    data: {
      code,
      type: b.type === 'FLAT' ? 'FLAT' : 'PERCENT',
      value: Math.round(Number(b.value)),
      minSubtotal: Math.round(Number(b.minSubtotal)) || 0,
      maxDiscount: Math.round(Number(b.maxDiscount)) || 0,
      active: b.active === undefined ? true : Boolean(b.active),
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      note: sanitizeText((b.note || '').trim().slice(0, 200)),
    },
  });
  await audit(user.email, 'coupon.create', { code: created.code });
  return NextResponse.json({ coupon: created }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;
  const b = (await req.json().catch(() => ({}))) as CouponBody;
  if (!b.id) return NextResponse.json({ error: 'Coupon id required' }, { status: 400 });
  const existing = await db.coupon.findUnique({ where: { id: b.id } });
  if (!existing) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (b.code !== undefined) {
    const code = b.code.trim().toUpperCase();
    if (!CODE_RE.test(code)) return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    const dup = await db.coupon.findFirst({ where: { code, id: { not: existing.id } } });
    if (dup) return NextResponse.json({ error: `Coupon ${code} already exists` }, { status: 409 });
    data.code = code;
  }
  if (b.type !== undefined || b.value !== undefined) {
    const invalid = validateFields({ type: b.type ?? (existing.type as 'PERCENT' | 'FLAT'), value: b.value ?? existing.value, expiresAt: b.expiresAt !== undefined ? b.expiresAt : (existing.expiresAt?.toISOString() ?? null) });
    if (invalid && b.value !== undefined) return NextResponse.json({ error: invalid }, { status: 400 });
    if (b.type !== undefined) data.type = b.type === 'FLAT' ? 'FLAT' : 'PERCENT';
    if (b.value !== undefined) {
      const v = asInt(b.value);
      if (v === null || v < 1) return NextResponse.json({ error: 'Value must be at least 1' }, { status: 400 });
      if ((b.type ?? existing.type) === 'PERCENT' && v > 99) return NextResponse.json({ error: 'Percent discounts are capped at 99' }, { status: 400 });
      data.value = v;
    }
  }
  if (b.minSubtotal !== undefined) data.minSubtotal = Math.round(Number(b.minSubtotal)) || 0;
  if (b.maxDiscount !== undefined) data.maxDiscount = Math.round(Number(b.maxDiscount)) || 0;
  if (typeof b.active === 'boolean') data.active = b.active;
  if (b.expiresAt !== undefined) {
    if (b.expiresAt === null || b.expiresAt === '') data.expiresAt = null;
    else {
      const d = new Date(b.expiresAt);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
      data.expiresAt = d;
    }
  }
  if (b.note !== undefined) data.note = sanitizeText(b.note.trim().slice(0, 200));

  const updated = await db.coupon.update({ where: { id: existing.id }, data });
  await audit(user.email, 'coupon.update', { code: updated.code, fields: Object.keys(data) });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Coupon id required' }, { status: 400 });
  const coupon = await db.coupon.findUnique({ where: { id } });
  if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
  await db.coupon.delete({ where: { id } });
  await audit(user.email, 'coupon.delete', { code: coupon.code });
  return NextResponse.json({ ok: true });
}
