import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueEmail, templates } from '@/lib/email';
import { rateLimitGuard, str, isEmail, isPhone, sanitizeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'contact', 3, 60 * 60 * 1000);
  if (limited) return limited;

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = sanitizeText(str(b.name, 80));
  const email = str(b.email, 200).toLowerCase();
  const phone = str(b.phone, 16);
  const subject = sanitizeText(str(b.subject, 150));
  const message = sanitizeText(str(b.message, 2000));

  if (!name || !isEmail(email) || !message) {
    return NextResponse.json({ error: 'Name, valid email and message are required' }, { status: 400 });
  }

  await db.contactMessage.create({ data: { name, email, phone, subject, message } });

  // auto-reply + admin alert (queued → SMTP or admin Outbox)
  await queueEmail(email, templates.contactReply(name), 'contactReply').catch(() => {});
  await queueEmail(process.env.ADMIN_EMAIL || 'admin@biharse.org', {
    subject: `📨 Contact form: ${subject || '(no subject)'} — ${name}`,
    html: `<p><b>${name}</b> (${email}${phone ? `, ${phone}` : ''}) wrote:</p><p>${message.replace(/\n/g, '<br/>')}</p>`,
    text: `${name} (${email}): ${message}`,
  }, 'adminContactAlert').catch(() => {});

  return NextResponse.json({ ok: true });
}
