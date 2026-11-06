import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refundPayment } from '@/lib/payments';
import { queueEmail, templates } from '@/lib/email';
import { getSessionUser, rateLimitGuard, str, audit } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Customer self-service cancellation — allowed only while an order is PAID
 * (i.e. paid but not yet being prepared). A full refund is triggered on the
 * gateway; on success the order becomes REFUNDED, on failure CANCELLED with a
 * REFUND_FAILED payment event so an admin can follow up manually.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'order-cancel', 3, 60 * 60 * 1000);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as { number?: string; email?: string; reason?: string; note?: string } | null;
  const number = str(body?.number, 32).toUpperCase();
  if (!number) return NextResponse.json({ error: 'Order number is required' }, { status: 400 });

  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Auth: session owner (customer id or account email) OR guest matching the order email
  const user = await getSessionUser(req);
  const sessionOwner = Boolean(user && (order.customerId === user.id || order.email === user.email.toLowerCase()));
  const emailMatch = str(body?.email, 200).toLowerCase() === order.email;
  if (!sessionOwner && !emailMatch) {
    return NextResponse.json({ error: 'You are not authorised to cancel this order' }, { status: 403 });
  }

  if (order.status !== 'PAID') {
    const msg = ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAYMENT_REVIEW'].includes(order.status)
      ? 'This order is not paid yet — nothing to cancel'
      : 'Order is already being prepared; contact support';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  /* Full refund via the gateway.
     Contract (see src/lib/payments.ts): refundPayment(providerPaymentId, amountPaise) → { ok, refundId?, error? } */
  const refund = refundPayment as unknown as
    (paymentId: string, amountPaise: number) => Promise<{ ok: boolean; refundId?: string; error?: string }>;
  let refunded = false;
  let refundId = '';
  let refundError = '';
  try {
    const r = await refund(order.paymentId, order.total);
    refunded = Boolean(r?.ok);
    refundId = str(r?.refundId ?? '', 100);
    refundError = str(r?.error ?? '', 300);
  } catch (e) {
    refundError = String(e).slice(0, 300);
  }

  const status = refunded ? 'REFUNDED' : 'CANCELLED';
  const reason = str(body?.reason, 60);
  const note = str(body?.note, 300);

  await db.order.update({ where: { id: order.id }, data: { status } });

  await db.paymentEvent.create({
    data: {
      orderId: order.id,
      provider: order.paymentProvider || 'razorpay',
      eventType: refunded ? 'CUSTOMER_CANCEL_REFUND' : 'REFUND_FAILED',
      externalEventId: `customer_cancel_${order.number}_${Date.now().toString(36)}`,
      paymentOrderId: order.paymentOrderId,
      paymentId: order.paymentId,
      payloadJson: JSON.stringify({ refundId, error: refundError, reason, note, channel: 'customer_self_cancel' }),
      signatureValid: true,
      processed: true,
    },
  });

  await audit(user?.email || order.email, 'ORDER_CANCELLED_BY_CUSTOMER', {
    orderNumber: order.number,
    status,
    refundId,
    refundError,
    reason,
  });

  let customerName = 'Namaste';
  try { customerName = JSON.parse(order.addressJson)?.name || customerName; } catch { /* keep default */ }
  await queueEmail(
    order.email,
    templates.orderCancelled(customerName, order.number, refunded),
    refunded ? 'orderCancelled' : 'orderCancelledRefundPending',
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    status,
    refundId: refundId || undefined,
    error: refunded ? undefined : (refundError || 'Refund could not be started — support will follow up'),
  });
}
