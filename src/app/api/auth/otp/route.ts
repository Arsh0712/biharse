import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { queueEmail, templates } from '@/lib/email';
import { rateLimitGuard, isEmail, str } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Request an OTP (login/signup). 6 digits, bcrypt-hashed, 10-minute TTL, 5 attempts. */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'otp', 3, 10 * 60 * 1000);
  if (limited) return limited;

  const { email, name } = (await req.json().catch(() => ({}))) as { email?: string; name?: string };
  const cleanEmail = str(email, 200).toLowerCase();
  if (!isEmail(cleanEmail)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);

  // invalidate previous unconsumed OTPs
  await db.otpCode.updateMany({ where: { email: cleanEmail, consumed: false }, data: { consumed: true } });
  await db.otpCode.create({
    data: {
      email: cleanEmail,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await queueEmail(cleanEmail, templates.otp(cleanEmail, code), 'otp');

  // Ensure the customer record exists (created at login — no separate signup step)
  const existing = await db.customer.findUnique({ where: { email: cleanEmail } });
  if (!existing) {
    await db.customer.create({
      data: { email: cleanEmail, name: str(name, 80) || cleanEmail.split('@')[0] },
    });
  }

  return NextResponse.json({ ok: true, sent: true });
}
