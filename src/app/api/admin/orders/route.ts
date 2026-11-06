import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit } from '@/lib/security';
import { refundPayment } from '@/lib/payments';
import { queueEmail, templates } from '@/lib/email';
import { serializeOrder } from '@/lib/serialize-order';

export const dynamic = 'force-dynamic';

const FLOW_STATUSES = ['PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** Statuses earlier than SHIPPED that a tracking save may advance into SHIPPED. */
const TRACKING_ADVANCES = ['PAID', 'PACKING'];

export async function GET(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['orders']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || '';
  const q = (sp.get('q') || '').trim();
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';

  // single-order detail (payment events timeline included)
  const id = (sp.get('id') || '').trim();
  if (id) {
    const order = await db.order.findUnique({ where: { id }, include: { items: true, paymentEvents: { orderBy: { createdAt: 'asc' } } } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order: serializeOrder(order), viewerRole: user.role });
  }

  const page = Math.max(1, Number(sp.get('page')) || 1);
  const perPage = Math.min(200, Math.max(1, Number(sp.get('perPage')) || 50));

  const where: Record<string, unknown> = {};
  if (status && status !== 'all') where.status = status;
  if (q) where.OR = [{ number: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }];
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) { const d = new Date(from); if (!Number.isNaN(d.getTime())) range.gte = d; }
    if (to) { const d = new Date(to); if (!Number.isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); range.lte = d; } }
    if (Object.keys(range).length > 0) where.createdAt = range;
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({
    orders: orders.map(serializeOrder),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    viewerRole: user.role,
  });
}

interface PatchBody {
  id: string;
  action: 'status' | 'refund' | 'tracking';
  status?: string;
  trackingNumber?: string;
  courier?: string;
  amount?: number; // refund amount in paise (omit for full)
  reason?: string;
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['orders']);
  if (error) return error;

  const b = (await req.json().catch(() => ({}))) as PatchBody;
  if (!b.id) return NextResponse.json({ error: 'Order id required' }, { status: 400 });

  const order = await db.order.findUnique({ where: { id: b.id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (b.action === 'refund') {
    // PAYMENT_REVIEW included: a held order may already have a captured payment and needs
    // the gateway refund path to be resolved. The paymentId check below guards un-paid orders.
    if (!['PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'PAYMENT_REVIEW'].includes(order.status)) {
      return NextResponse.json({ error: 'Only paid orders can be refunded' }, { status: 400 });
    }
    if (!order.paymentId) return NextResponse.json({ error: 'No captured payment on this order' }, { status: 400 });
    try {
      const r = await refundPayment(order.paymentId, b.amount && b.amount < order.total ? b.amount : undefined);
      const full = !b.amount || b.amount >= order.total;
      await db.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
      await db.paymentEvent.create({
        data: {
          provider: order.paymentProvider,
          eventType: 'refund.processed',
          externalEventId: `admin_${r.refundId}`,
          paymentId: order.paymentId,
          paymentOrderId: order.paymentOrderId,
          payloadJson: JSON.stringify({ refundId: r.refundId, reason: b.reason ?? '', amount: b.amount ?? order.total, by: user.email }),
          processed: true,
          signatureValid: true,
          orderId: order.id,
        },
      });
      const name = (() => { try { return (JSON.parse(order.addressJson) as { name?: string }).name || 'there'; } catch { return 'there'; } })();
      await queueEmail(order.email, templates.refundProcessed(name, order.number, b.amount ?? order.total), 'refundProcessed');
      await audit(user.email, 'order.refund', { order: order.number, refundId: r.refundId });
      return NextResponse.json({ ok: true, refundId: r.refundId, full });
    } catch (e) {
      return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
    }
  }

  if (b.action === 'tracking') {
    const trackingNumber = (b.trackingNumber || '').trim().slice(0, 60);
    const courier = (b.courier || '').trim().slice(0, 60);
    if (!trackingNumber && !courier) return NextResponse.json({ error: 'Add a tracking number or courier' }, { status: 400 });

    const advance = TRACKING_ADVANCES.includes(order.status) && Boolean(trackingNumber);
    const data: Record<string, unknown> = { trackingNumber, courier };
    if (advance) {
      data.status = 'SHIPPED';
      data.shippedAt = new Date();
    }
    await db.order.update({ where: { id: order.id }, data });
    await audit(user.email, 'order.tracking', { order: order.number, courier, trackingNumber, advanced: advance });

    const name = (() => { try { return (JSON.parse(order.addressJson) as { name?: string }).name || 'there'; } catch { return 'there'; } })();
    if (advance) {
      await queueEmail(order.email, templates.shipped(name, order.number, courier || 'our delivery partner', trackingNumber), 'shipped');
    }
    return NextResponse.json({ ok: true, advanced: advance });
  }

  if (b.action === 'status') {
    const next = b.status || '';
    const allowed = ['PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'REFUNDED'];
    if (!allowed.includes(next)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    // PAYMENT_REVIEW is an engine-set hold (amount mismatch / stock failure) — restricted resolution paths only.
    if (order.status === 'PAYMENT_REVIEW' && !['PACKING', 'SHIPPED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED'].includes(next)) {
      return NextResponse.json({ error: 'Review-hold orders can only move to Packing, Shipped, Payment Failed, Cancelled or Refunded' }, { status: 400 });
    }

    const data: Record<string, unknown> = { status: next };
    if (next === 'SHIPPED') {
      data.shippedAt = new Date();
      data.trackingNumber = (b.trackingNumber || order.trackingNumber || '').trim();
      data.courier = (b.courier || order.courier || '').trim();
    }
    if (next === 'DELIVERED') data.deliveredAt = new Date();

    await db.order.update({ where: { id: order.id }, data });
    await audit(user.email, 'order.status', { order: order.number, from: order.status, to: next });

    // transactional email on the state change
    const name = (() => { try { return (JSON.parse(order.addressJson) as { name?: string }).name || 'there'; } catch { return 'there'; } })();
    if (next === 'SHIPPED') {
      await queueEmail(order.email, templates.shipped(name, order.number, (data.courier as string) || 'our delivery partner', (data.trackingNumber as string) || ''), 'shipped');
    }
    if (next === 'DELIVERED') {
      await queueEmail(order.email, templates.delivered(name, order.number), 'delivered');
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
