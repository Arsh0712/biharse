import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, str, isPhone, isPincode, sanitizeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const addresses = await db.address.findMany({ where: { customerId: user.id }, orderBy: { isDefault: 'desc' } });
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;

  if (!b.name || !b.line1 || !b.city || !b.state || !isPincode(b.pincode || '') || !isPhone(b.phone || '')) {
    return NextResponse.json({ error: 'Complete address with valid phone and pincode required' }, { status: 400 });
  }

  // first address becomes default; profile phone gets backfilled
  const count = await db.address.count({ where: { customerId: user.id } });
  const address = await db.address.create({
    data: {
      customerId: user.id,
      label: str(b.label, 40) || 'Home',
      name: sanitizeText(str(b.name, 80)),
      phone: str(b.phone, 16),
      line1: sanitizeText(str(b.line1, 200)),
      line2: sanitizeText(str(b.line2, 200)),
      city: sanitizeText(str(b.city, 80)),
      state: sanitizeText(str(b.state, 80)),
      pincode: b.pincode,
      isDefault: count === 0 || Boolean(b.isDefault),
    },
  });
  if (!user.phone) await db.customer.update({ where: { id: user.id }, data: { phone: str(b.phone, 16) } });

  return NextResponse.json({ address });
}

/** PATCH — edit label/name/phone/lines/city/state/pincode (+ isDefault with default-uniqueness). */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = str(b.id, 64);
  if (!id) return NextResponse.json({ error: 'Address id required' }, { status: 400 });

  const existing = await db.address.findUnique({ where: { id } });
  if (!existing || existing.customerId !== user.id) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  const data: Record<string, string | boolean> = {};
  if (b.label !== undefined) data.label = str(b.label as string, 40) || 'Home';
  if (b.name !== undefined) {
    const v = sanitizeText(str(b.name as string, 80));
    if (!v) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    data.name = v;
  }
  if (b.phone !== undefined) {
    if (!isPhone(str(b.phone as string, 16))) return NextResponse.json({ error: 'Valid phone required' }, { status: 400 });
    data.phone = str(b.phone as string, 16);
  }
  if (b.line1 !== undefined) {
    const v = sanitizeText(str(b.line1 as string, 200));
    if (!v) return NextResponse.json({ error: 'Address line 1 required' }, { status: 400 });
    data.line1 = v;
  }
  if (b.line2 !== undefined) data.line2 = sanitizeText(str(b.line2 as string, 200));
  if (b.city !== undefined) {
    const v = sanitizeText(str(b.city as string, 80));
    if (!v) return NextResponse.json({ error: 'City required' }, { status: 400 });
    data.city = v;
  }
  if (b.state !== undefined) {
    const v = sanitizeText(str(b.state as string, 80));
    if (!v) return NextResponse.json({ error: 'State required' }, { status: 400 });
    data.state = v;
  }
  if (b.pincode !== undefined) {
    if (!isPincode(str(b.pincode as string, 6))) return NextResponse.json({ error: '6-digit pincode required' }, { status: 400 });
    data.pincode = str(b.pincode as string, 6);
  }
  if (b.isDefault !== undefined && typeof b.isDefault === 'boolean') data.isDefault = b.isDefault;

  const address = await db.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.address.updateMany({ where: { customerId: user.id, NOT: { id } }, data: { isDefault: false } });
    }
    return tx.address.update({ where: { id }, data });
  });

  return NextResponse.json({ address });
}

/** DELETE — remove an owned address (?id=…); if it was the default, promote the newest remaining one. */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Address id required' }, { status: 400 });

  const existing = await db.address.findUnique({ where: { id } });
  if (!existing || existing.customerId !== user.id) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { customerId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });

  return NextResponse.json({ ok: true });
}
