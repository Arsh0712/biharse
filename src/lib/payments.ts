// Payment engine — real Razorpay when keys exist, sandbox twin otherwise.
// Both paths share identical server contracts (create → checkout → verify signature → webhook).
import crypto from 'crypto';
import { db } from './db';
import { queueEmail } from './email';

export type PaymentMode = 'razorpay' | 'sandbox';

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

export function paymentMode(): PaymentMode {
  return KEY_ID && KEY_SECRET ? 'razorpay' : 'sandbox';
}

export function sandboxSecret() {
  return KEY_SECRET || process.env.NEXTAUTH_SECRET || 'biharse-sandbox-secret-v1';
}

export function publicKeyId() {
  return paymentMode() === 'razorpay' ? KEY_ID : 'rzp_test_sandbox';
}

function authHeader() {
  return `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`;
}

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  mode: PaymentMode;
}

export async function createGatewayOrder(opts: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<GatewayOrder> {
  if (paymentMode() === 'razorpay') {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify({
        amount: opts.amountPaise,
        currency: 'INR',
        receipt: opts.receipt,
        notes: opts.notes,
        payment_capture: 1,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Razorpay order failed: ${r.status} ${body.slice(0, 300)}`);
    }
    const j = (await r.json()) as { id: string; amount: number; currency: string; receipt: string };
    return { id: j.id, amount: j.amount, currency: j.currency, receipt: j.receipt, mode: 'razorpay' };
  }
  // sandbox twin — same shape, local id
  const id = `sbx_order_${crypto.randomBytes(10).toString('hex')}`;
  return { id, amount: opts.amountPaise, currency: 'INR', receipt: opts.receipt, mode: 'sandbox' };
}

/** Gateway-side "payment result" — live: Razorpay hands these to Checkout; sandbox: /api/payment/sandbox-confirm returns them. */
export function sandboxGatewayResult(paymentOrderId: string, method: string) {
  const paymentId = `sbx_pay_${crypto.randomBytes(10).toString('hex')}`;
  const signature = signSandbox(paymentOrderId, paymentId);
  return { paymentId, signature, method };
}

export function signSandbox(paymentOrderId: string, paymentId: string) {
  return crypto.createHmac('sha256', sandboxSecret()).update(`${paymentOrderId}|${paymentId}`).digest('hex');
}

/** Server-side verification of razorpay_signature (HMAC-SHA256 of order_id|payment_id with secret). */
export function verifyCheckoutSignature(paymentOrderId: string, paymentId: string, signature: string, mode: PaymentMode) {
  const expected = mode === 'razorpay'
    ? crypto.createHmac('sha256', KEY_SECRET).update(`${paymentOrderId}|${paymentId}`).digest('hex')
    : signSandbox(paymentOrderId, paymentId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Authoritative gateway payment entity (Razorpay REST). Null when keys are absent, payment unknown, or fetch fails. */
export async function fetchGatewayPayment(paymentId: string): Promise<{ id: string; amount: number; status: string } | null> {
  if (paymentMode() !== 'razorpay') return null;
  try {
    const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: authHeader() },
    });
    if (!r.ok) return null;
    return (await r.json()) as { id: string; amount: number; status: string };
  } catch {
    return null;
  }
}

/** Amount integrity — the gateway captured amount (paise) must equal the server-side order total. */
export function verifyPaymentAmount(order: { total: number }, gatewayPayment: { amount?: number | null }): boolean {
  return typeof gatewayPayment.amount === 'number' && gatewayPayment.amount === order.total;
}

type ReviewEventType = 'AMOUNT_MISMATCH' | 'STOCK_DECREMENT_FAILED' | 'AMOUNT_VERIFY_UNAVAILABLE';

/**
 * Hold an order for manual review on a payment anomaly (wrong amount captured, stock could not
 * be reserved, gateway amount unverifiable). Sets status → PAYMENT_REVIEW, records a PaymentEvent
 * (processed: false = needs admin action) and emails the admin via the outbox.
 */
export async function flagPaymentReview(opts: {
  orderId: string;
  orderNumber: string;
  eventType: ReviewEventType;
  provider?: string;
  paymentOrderId?: string;
  paymentId?: string;
  payload: Record<string, unknown>;
  note: string;
}): Promise<void> {
  await db.order.updateMany({
    where: { id: opts.orderId, status: { in: ['PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED'] } },
    data: { status: 'PAYMENT_REVIEW' },
  }).catch(() => {});
  await db.paymentEvent.create({
    data: {
      provider: opts.provider || 'razorpay',
      eventType: opts.eventType,
      externalEventId: `${opts.eventType}_${opts.orderId}_${Date.now()}`,
      paymentOrderId: opts.paymentOrderId || '',
      paymentId: opts.paymentId || '',
      payloadJson: JSON.stringify({ ...opts.payload, note: opts.note, orderNumber: opts.orderNumber }),
      processed: false,
      signatureValid: true,
      orderId: opts.orderId,
    },
  }).catch(() => {});
  console.error(`[payments] ${opts.eventType} — order ${opts.orderNumber} held for review: ${opts.note}`);
  const admin = process.env.ADMIN_EMAIL || 'admin@biharse.org';
  await queueEmail(admin, {
    subject: `⚠️ ${opts.eventType} — order ${opts.orderNumber} held for review`,
    html: `<p style="font-size:15px;line-height:1.7;color:#1C130B;">Order <b>${opts.orderNumber}</b> was placed under <b>PAYMENT_REVIEW</b> by the payment engine.</p><p style="font-size:14px;color:#5a4632;">${opts.note}</p><p style="font-size:13px;color:#7D6450;">Resolve it in Admin → Orders (review holds accept Packing / Shipped / Payment Failed / Cancelled / Refunded). Full details were recorded in Payment Events.</p>`,
    text: `${opts.eventType} — order ${opts.orderNumber} held for review. ${opts.note}`,
  }, 'adminPaymentAlert').catch(() => {});
}

/** Gateway refund (Razorpay REST) or sandbox twin. Omit `amountPaise` for a full refund. */
export async function refundPayment(
  providerPaymentId: string,
  amountPaise?: number,
  speed: 'normal' | 'optimum' = 'normal',
): Promise<{ refundId: string; status: string }> {
  const mode: PaymentMode =
    paymentMode() === 'razorpay' && !providerPaymentId.startsWith('sbx_pay_') ? 'razorpay' : 'sandbox';
  if (mode === 'razorpay') {
    const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(providerPaymentId)}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify({
        amount: amountPaise, // undefined = full refund
        speed,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Refund failed: ${r.status} ${body.slice(0, 300)}`);
    }
    const j = (await r.json()) as { id: string; status: string };
    return { refundId: j.id, status: j.status };
  }
  return { refundId: `sbx_rfn_${crypto.randomBytes(8).toString('hex')}`, status: 'processed' };
}

/* Idempotent order confirmation — shared by /api/payment/verify and webhooks */
export async function confirmOrderPaid(orderId: string, details: {
  paymentId: string;
  signature: string;
  method: string;
  provider: string;
  externalEventId: string;
}): Promise<{ duplicate: boolean; flagged?: 'stock_decrement_failed' }> {
  // event idempotency
  const existing = await db.paymentEvent.findUnique({
    where: { provider_externalEventId: { provider: details.provider, externalEventId: details.externalEventId } },
  });
  if (existing?.processed) {
    return { duplicate: true };
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');

  if (order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_FAILED') {
    // decrement stock atomically WITH the PAID flip — no partial decrements, no silent failures
    const items = await db.orderItem.findMany({ where: { orderId } });
    try {
      await db.$transaction(async (tx) => {
        for (const item of items) {
          if (!item.slug) continue;
          const res = await tx.product.updateMany({
            where: { slug: item.slug, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (res.count === 0) throw new Error(`STOCK_SHORT:${item.slug}`);
        }
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paymentId: details.paymentId,
            paymentSignature: details.signature,
            paymentMethod: details.method,
          },
        });
      });
    } catch (err) {
      // Stock could not be reserved (insufficient stock or DB error) — hold for review,
      // never silently mark a paid order when fulfilment integrity is broken.
      const msg = (err as Error)?.message || '';
      const failedSlug = msg.startsWith('STOCK_SHORT:') ? msg.slice('STOCK_SHORT:'.length) : '';
      await flagPaymentReview({
        orderId,
        orderNumber: order.number,
        eventType: 'STOCK_DECREMENT_FAILED',
        provider: details.provider,
        paymentOrderId: order.paymentOrderId,
        paymentId: details.paymentId,
        payload: { failedSlug: failedSlug || 'unknown', transactionRolledBack: true },
        note: failedSlug
          ? `Stock could not be reserved for "${failedSlug}" — transaction rolled back, order NOT marked paid.`
          : 'Stock decrement failed with a database error — transaction rolled back, order NOT marked paid.',
      });
      return { duplicate: false, flagged: 'stock_decrement_failed' };
    }
  }

  await db.paymentEvent.upsert({
    where: { provider_externalEventId: { provider: details.provider, externalEventId: details.externalEventId } },
    update: { processed: true },
    create: {
      provider: details.provider,
      eventType: 'payment.captured',
      externalEventId: details.externalEventId,
      paymentOrderId: order.paymentOrderId,
      paymentId: details.paymentId,
      processed: true,
      signatureValid: true,
      orderId,
    },
  });

  return { duplicate: false };
}

export async function markOrderPaymentFailed(orderId: string, reason: string, externalEventId: string) {
  const existing = await db.paymentEvent.findUnique({
    where: { provider_externalEventId: { provider: 'razorpay', externalEventId } },
  });
  if (existing) return { duplicate: true };
  await db.paymentEvent.create({
    data: { provider: 'razorpay', eventType: 'payment.failed', externalEventId, processed: true },
  });
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (order && order.status === 'PENDING_PAYMENT') {
    await db.order.update({ where: { id: orderId }, data: { status: 'PAYMENT_FAILED' } });
  }
  return { duplicate: false };
}
