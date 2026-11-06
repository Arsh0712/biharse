import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbSeeded } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession, sessionCookie, rateLimitGuard, isEmail, str } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Password login (for admin/staff convenience). Customer login stays OTP-based. */
export async function POST(req: NextRequest) {
  await ensureDbSeeded();
  const limited = rateLimitGuard(req, 'login', 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const cleanEmail = str(email, 200).toLowerCase();
  if (!isEmail(cleanEmail) || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

  const customer = await db.customer.findUnique({ where: { email: cleanEmail } });
  if (!customer?.passwordHash) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const session = await createSession(customer.id);
  const res = NextResponse.json({
    user: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone, role: customer.role },
  });
  res.headers.set('Set-Cookie', sessionCookie(session.token, session.maxAge));
  return res;
}
