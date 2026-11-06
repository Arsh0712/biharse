import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyWebhookSignature,
  confirmOrderPaid,
  markOrderPaymentFailed,
  verifyPaymentAmount,
  flagPaymentReview,
} from '@/lib/payments';
import { queueEmail, templates } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface RazorpayWebhook {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; method?: string; status: string; amount: number } };
    order?: { entity: { id: string; amount: number } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
}

/** Razorpay webhooks — signature-verified, idempotent (unique event ids), reconciliation-safe. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  const valid = verifyWebhookSignature(raw, signature);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  let body: RazorpayWebhook;
  try {
    body = JSON.parse(raw) as RazorpayWebhook;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId = req.headers.get('x-razorpay-event-id') || `${body.event}:${body.payload?.payment?.entity?.id ?? Date.now()}`;

  // global idempotency
  try {
    await db.webhookEvent.create({ data: { provider: 'razorpay', eventId, eventType: body.event, payloadJson: raw.slice(0, 10000) } });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const payment = body.payload?.payment?.entity;
  if (!payment) return NextResponse.json({ ok: true });

  const order = await db.order.findFirst({ where: { paymentOrderId: payment.order_id }, include: { items: true } });

  switch (body.event) {
    case 'payment.captured':
    case 'order.paid':
    case 'payment.authorized': {
      if (order) {
        // Amount integrity from the authoritative webhook entity — hold for review instead of confirming on mismatch.
        if (!verifyPaymentAmount(order, payment)) {
          await flagPaymentReview({
            orderId: order.id,
            orderNumber: order.number,
            eventType: 'AMOUNT_MISMATCH',
            provider: 'razorpay',
            paymentOrderId: payment.order_id,
            paymentId: payment.id,
            payload: { gatewayAmountPaise: payment.amount, orderTotalPaise: order.total, webhookEvent: body.event },
            note: `Webhook ${body.event}: captured amount (${payment.amount} paise) does not match order total (${order.total} paise).`,
          });
          break;
        }
        const r = await confirmOrderPaid(order.id, {
          paymentId: payment.id,
          signature: 'webhook',
          method: payment.method || 'webhook',
          provider: 'razorpay',
          externalEventId: eventId,
        });
        if (r.flagged === 'stock_decrement_failed') {
          // Order held in PAYMENT_REVIEW + admin alerted inside flagPaymentReview; no confirmation email.
          break;
        }
        if (!r.duplicate) {
          await queueEmail(order.email, templates.orderConfirmation(
            (() => { try { return (JSON.parse(order.addressJson) as { name?: string }).name || 'there'; } catch { return 'there'; } })(),
            order.number, order.total,
            order.items.map((i) => ({ nameEn: i.nameEn, variantLabel: i.variantLabel, qty: i.qty, lineTotal: i.lineTotal })),
          ), 'orderConfirmation');
          await queueEmail(process.env.ADMIN_EMAIL || 'admin@biharse.org', templates.adminNewOrder(order.number, order.email, order.total, order.items.length), 'adminNewOrder').catch(() => {});
        }
      }
      break;
    }
    case 'payment.failed': {
      if (order) {
        await markOrderPaymentFailed(order.id, 'razorpay webhook', eventId);
        await queueEmail(order.email, templates.paymentFailed(order.number), 'paymentFailed');
      }
      break;
    }
    case 'refund.processed': {
      if (order && order.status !== 'REFUNDED') {
        await db.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
        await queueEmail(order.email, templates.refundProcessed(
          (() => { try { return (JSON.parse(order.addressJson) as { name?: string }).name || 'there'; } catch { return 'there'; } })(),
          order.number, body.payload?.refund?.entity?.amount ?? order.total,
        ), 'refundProcessed');
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
