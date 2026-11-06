import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  confirmOrderPaid,
  verifyCheckoutSignature,
  verifyPaymentAmount,
  fetchGatewayPayment,
  flagPaymentReview,
} from '@/lib/payments';
import { queueEmail, templates } from '@/lib/email';
import { rateLimitGuard } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Verifies razorpay_signature (HMAC-SHA256 of order_id|payment_id) server-side,
 * re-checks the captured amount against the order total, then confirms the order
 * exactly once (idempotent with webhook path). Money/stock anomalies are held for
 * admin review instead of being accepted.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'payverify', 12, 60 * 1000);
  if (limited) return limited;

  const { orderNumber, paymentOrderId, paymentId, signature, method } = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (!orderNumber || !paymentOrderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'Missing payment confirmation fields' }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { number: orderNumber }, include: { items: true } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.paymentOrderId !== paymentOrderId) {
    return NextResponse.json({ error: 'Payment order mismatch' }, { status: 400 });
  }

  const valid = verifyCheckoutSignature(paymentOrderId, paymentId, signature, order.paymentProvider as 'razorpay' | 'sandbox');
  if (!valid) {
    // tamper attempt / corruption — hold the order, log it
    await db.paymentEvent.create({
      data: {
        provider: order.paymentProvider,
        eventType: 'signature.invalid',
        externalEventId: `sig_${paymentOrderId}_${Date.now()}`,
        paymentOrderId,
        paymentId,
        payloadJson: JSON.stringify({ orderNumber }),
        signatureValid: false,
      },
    }).catch(() => {});
    return NextResponse.json({ error: 'Payment signature verification failed. Order held — support will contact you.' }, { status: 400 });
  }

  // ── Amount integrity ─────────────────────────────────────────────
  // Sandbox twin: the gateway order amount is enforced server-side at creation
  // (createGatewayOrder), so there is no external amount to re-check.
  // Razorpay: verify against the authoritative payment entity — fail-closed.
  if (order.paymentProvider === 'razorpay') {
    const gatewayPayment = await fetchGatewayPayment(paymentId);
    if (!gatewayPayment) {
      await flagPaymentReview({
        orderId: order.id,
        orderNumber: order.number,
        eventType: 'AMOUNT_VERIFY_UNAVAILABLE',
        provider: order.paymentProvider,
        paymentOrderId,
        paymentId,
        payload: { orderTotalPaise: order.total },
        note: 'Gateway payment entity could not be fetched for amount verification (fail-closed) — order held for review.',
      });
      return NextResponse.json(
        { ok: false, reason: 'amount_verification_unavailable', error: 'Payment is under review — our team will confirm it shortly.' },
        { status: 402 },
      );
    }
    if (!verifyPaymentAmount(order, gatewayPayment)) {
      await flagPaymentReview({
        orderId: order.id,
        orderNumber: order.number,
        eventType: 'AMOUNT_MISMATCH',
        provider: order.paymentProvider,
        paymentOrderId,
        paymentId,
        payload: { gatewayAmountPaise: gatewayPayment.amount, orderTotalPaise: order.total, gatewayStatus: gatewayPayment.status },
        note: `Captured amount (${gatewayPayment.amount} paise) does not match order total (${order.total} paise).`,
      });
      return NextResponse.json(
        { ok: false, reason: 'amount_mismatch', error: 'Payment is under review — please contact support.' },
        { status: 402 },
      );
    }
  }

  const externalEventId = `${paymentOrderId}:${paymentId}`;
  const result = await confirmOrderPaid(order.id, {
    paymentId,
    signature,
    method: method || 'checkout',
    provider: order.paymentProvider,
    externalEventId,
  });

  if (result.flagged === 'stock_decrement_failed') {
    // Order is in PAYMENT_REVIEW; admin alerted. Frontend shows its generic retry/support message.
    return NextResponse.json(
      { ok: false, reason: 'stock_decrement_failed', error: 'Payment received but the order needs manual confirmation — support will contact you.' },
      { status: 409 },
    );
  }

  if (!result.duplicate) {
    // emails: customer confirmation + admin alert
    const name = (() => { try { return (JSON.parse(order.addressJson) as { name?: string }).name || 'there'; } catch { return 'there'; } })();
    await queueEmail(order.email, templates.orderConfirmation(name, order.number, order.total, order.items.map((i) => ({ nameEn: i.nameEn, variantLabel: i.variantLabel, qty: i.qty, lineTotal: i.lineTotal }))), 'orderConfirmation');
    const admin = process.env.ADMIN_EMAIL || 'admin@biharse.org';
    await queueEmail(admin, templates.adminNewOrder(order.number, name, order.total, order.items.length), 'adminNewOrder').catch(() => {});
  }

  return NextResponse.json({ ok: true, status: 'PAID', duplicate: result.duplicate });
}
