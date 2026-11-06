import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Payments status panel — config flags + recent gateway/webhook events. */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;

  const [events, webhookEvents] = await Promise.all([
    db.paymentEvent.findMany({
      include: { order: { select: { number: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    db.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
  ]);

  return NextResponse.json({
    paymentMode: process.env.RAZORPAY_KEY_ID ? 'razorpay' : 'sandbox',
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
    smtpConfigured: Boolean(process.env.SMTP_HOST),
    events: events.map((e) => ({
      id: e.id,
      orderNumber: e.order?.number ?? '',
      provider: e.provider,
      eventType: e.eventType,
      paymentId: e.paymentId,
      paymentOrderId: e.paymentOrderId,
      signatureValid: e.signatureValid,
      processed: e.processed,
      createdAt: e.createdAt.toISOString(),
    })),
    webhookEvents: webhookEvents.map((w) => ({
      id: w.id,
      provider: w.provider,
      eventType: w.eventType,
      processed: w.processed,
      createdAt: w.createdAt.toISOString(),
    })),
  });
}
