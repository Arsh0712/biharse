import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit, sanitizeText } from '@/lib/security';
import { queueEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['inbox']);
  if (error) return error;
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ messages });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireStaff(req, ['inbox']);
  if (error) return error;
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!id || !['NEW', 'REPLIED', 'CLOSED'].includes(status || '')) {
    return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
  }
  await db.contactMessage.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}

/** Reply to a contact message — queues the email and flips status to REPLIED. */
export async function POST(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['inbox']);
  if (error) return error;

  const { id, action, message } = (await req.json().catch(() => ({}))) as { id?: string; action?: string; message?: string };
  if (!id || action !== 'reply' || !message?.trim()) {
    return NextResponse.json({ error: 'id, action=reply and message required' }, { status: 400 });
  }

  const msg = await db.contactMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const reply = sanitizeText(message.trim().slice(0, 4000));
  const html = `<!doctype html><html><body style="margin:0;background:#FFF6E9;font-family:Georgia,serif;color:#1C130B;padding:28px;">
  <table role="presentation" width="100%" style="max-width:600px;background:#FFFDF7;border:1px solid rgba(109,58,34,0.16);border-radius:16px;"><tr><td style="padding:28px;">
  <p style="margin:0 0 16px;color:#6B3A22;">Namaste ${msg.name || 'there'},</p>
  <p style="margin:0 0 16px;white-space:pre-wrap;line-height:1.7;">${reply}</p>
  <p style="margin:0;color:#6B3A22;">With love from Bihar,<br><strong>BiharSe Support</strong></p>
  <hr style="border:none;border-top:1px solid rgba(109,58,34,0.14);margin:20px 0;">
  <p style="margin:0;color:#8A5A3B;font-size:12px;">Original message — ${msg.subject ? `“${msg.subject}” · ` : ''}${new Date(msg.createdAt).toLocaleString('en-IN')}:</p>
  <p style="margin:8px 0 0;color:#8A5A3B;font-size:13px;white-space:pre-wrap;">${sanitizeText(msg.message.slice(0, 1200))}</p>
  </td></tr></table></body></html>`;

  await queueEmail(msg.email, { subject: `Re: ${msg.subject || 'your message'} — BiharSe`, html, text: reply }, 'inboxReply');
  await db.contactMessage.update({ where: { id }, data: { status: 'REPLIED' } });
  await audit(user.email, 'inbox.reply', { to: msg.email, subject: msg.subject });
  return NextResponse.json({ ok: true });
}
