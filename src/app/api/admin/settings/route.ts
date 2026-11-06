import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit } from '@/lib/security';
import { paymentMode } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const PUBLIC_KEYS = ['announcement', 'hero', 'business', 'shipping', 'flags', 'footer'];

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;
  const rows = await db.siteSetting.findMany();
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try { map[r.key] = JSON.parse(r.valueJson); } catch { map[r.key] = r.valueJson; }
  }
  return NextResponse.json({ settings: map, paymentMode: paymentMode(), smtpConfigured: Boolean(process.env.SMTP_HOST), razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID) });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const updates = Object.entries(body).filter(([k]) => PUBLIC_KEYS.includes(k) && k !== 'business.gstin');

  for (const [key, value] of updates) {
    await db.siteSetting.upsert({
      where: { key },
      update: { valueJson: JSON.stringify(value) },
      create: { key, valueJson: JSON.stringify(value) },
    });
  }

  // GSTIN is env+admin: allow admin to store it as a business field too
  const biz = body.business as Record<string, unknown> | undefined;
  if (biz && typeof biz.gstin === 'string') {
    await db.siteSetting.upsert({
      where: { key: 'business' },
      update: { valueJson: JSON.stringify(biz) },
      create: { key: 'business', valueJson: JSON.stringify(biz) },
    });
  }

  await audit(user.email, 'settings.update', { keys: updates.map(([k]) => k) });
  return NextResponse.json({ ok: true });
}
