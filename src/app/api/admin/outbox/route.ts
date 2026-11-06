import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';
import { attemptSend } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;
  const rows = await db.emailOutbox.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  // strip heavy html for list view
  return NextResponse.json({
    outbox: rows.map((r) => ({ id: r.id, toEmail: r.toEmail, template: r.template, subject: r.subject, status: r.status, provider: r.provider, error: r.error, attempts: r.attempts, sentAt: r.sentAt, createdAt: r.createdAt })),
    smtpConfigured: Boolean(process.env.SMTP_HOST),
  });
}

/** Preview or retry an outbox email */
export async function POST(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;
  const { id, action } = (await req.json().catch(() => ({}))) as { id?: string; action?: 'view' | 'retry' };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (action === 'view') {
    const row = await db.emailOutbox.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ email: row });
  }
  if (action === 'retry') {
    const r = await attemptSend(id);
    return NextResponse.json({ ok: r.ok });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
