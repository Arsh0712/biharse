import { NextRequest, NextResponse } from 'next/server';
import { queueEmail, templates } from '@/lib/email';
import { requireStaff, audit } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** "Send test email" button — verifies SMTP config end to end. */
export async function POST(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;

  const { to } = (await req.json().catch(() => ({}))) as { to?: string };
  const target = to || user.email;
  await queueEmail(target, templates.testOk(), 'testEmail');
  return NextResponse.json({ ok: true, to: target, note: process.env.SMTP_HOST ? 'Sent via SMTP — check the inbox (and spam!)' : 'No SMTP configured — email stored in the Admin Outbox' });
}
