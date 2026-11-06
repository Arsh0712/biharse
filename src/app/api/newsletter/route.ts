import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueEmail, templates, randomToken } from '@/lib/email';
import { rateLimitGuard, isEmail, str } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Newsletter — double opt-in */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'newsletter', 4, 60 * 60 * 1000);
  if (limited) return limited;

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const clean = str(email, 200).toLowerCase();
  if (!isEmail(clean)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });

  const existing = await db.newsletterSubscriber.findUnique({ where: { email: clean } });
  if (existing?.status === 'CONFIRMED') return NextResponse.json({ ok: true, already: true });

  const token = existing?.token || randomToken();
  await db.newsletterSubscriber.upsert({
    where: { email: clean },
    update: { token, status: 'PENDING' },
    create: { email: clean, token, status: 'PENDING' },
  });

  await queueEmail(clean, templates.newsletterConfirm(token), 'newsletterConfirm');

  return NextResponse.json({ ok: true });
}
