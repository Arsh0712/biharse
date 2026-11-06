import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession, sessionCookie, rateLimitGuard, isEmail, str } from '@/lib/security';
import { queueEmail, templates } from '@/lib/email';

export const dynamic = 'force-dynamic';

/** Verify OTP → session. Creates welcome mail on first verified login. */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'otpverify', 8, 10 * 60 * 1000);
  if (limited) return limited;

  const { email, code } = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
  const cleanEmail = str(email, 200).toLowerCase();
  const cleanCode = str(code, 6);
  if (!isEmail(cleanEmail) || !/^\d{6}$/.test(cleanCode)) {
    return NextResponse.json({ error: 'Email and 6-digit code required' }, { status: 400 });
  }

  const otp = await db.otpCode.findFirst({
    where: { email: cleanEmail, consumed: false, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return NextResponse.json({ error: 'Code expired or not found. Request a new one.' }, { status: 400 });
  if (otp.attempts >= 5) return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 400 });

  const ok = await bcrypt.compare(cleanCode, otp.codeHash);
  if (!ok) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: 'Incorrect code' }, { status: 400 });
  }

  await db.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  let customer = await db.customer.findUnique({ where: { email: cleanEmail } });
  if (!customer) {
    customer = await db.customer.create({ data: { email: cleanEmail, name: cleanEmail.split('@')[0] } });
  }
  const firstLogin = !customer.emailVerified;
  customer = await db.customer.update({
    where: { id: customer.id },
    data: { emailVerified: true },
  });

  const session = await createSession(customer.id);

  if (firstLogin) {
    await queueEmail(cleanEmail, templates.welcome(customer.name), 'welcome').catch(() => {});
  }

  const res = NextResponse.json({
    user: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone, role: customer.role },
  });
  res.headers.set('Set-Cookie', sessionCookie(session.token, session.maxAge));
  return res;
}
