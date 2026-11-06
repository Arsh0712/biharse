import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';
import { serializeOrder } from '@/lib/serialize-order';

export const dynamic = 'force-dynamic';

const FLOW = ['PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/admin/orders/export — CSV attachment.
 * Filters match the orders list; ?ids=a,b,c exports an explicit selection.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['orders']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const idsParam = (sp.get('ids') || '').trim();
  const status = sp.get('status') || '';
  const q = (sp.get('q') || '').trim();
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';

  const where: Record<string, unknown> = {};
  if (idsParam) where.id = { in: idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500) };
  else {
    if (status && status !== 'all') where.status = status;
    if (q) where.OR = [{ number: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }];
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) { const d = new Date(from); if (!Number.isNaN(d.getTime())) range.gte = d; }
      if (to) { const d = new Date(to); if (!Number.isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); range.lte = d; } }
      if (Object.keys(range).length > 0) where.createdAt = range;
    }
  }

  const orders = await db.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 2000 });
  const rows = orders.map(serializeOrder);

  const header = ['Number', 'Date', 'Status', 'Email', 'Phone', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Coupon', 'Payment ID', 'Tracking', 'Courier', 'City'];
  const lines = [header.join(',')];
  for (const o of rows) {
    lines.push([
      o.number,
      new Date(o.createdAt).toISOString(),
      o.status,
      o.email,
      o.phone,
      o.items.reduce((a, it) => a + it.qty, 0),
      o.subtotal,
      o.discount,
      o.shipping,
      o.total,
      o.couponCode,
      o.paymentId,
      o.trackingNumber,
      o.courier,
      o.address?.city ?? '',
    ].map(csvCell).join(','));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const csv = `\uFEFF${lines.join('\r\n')}`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="biharse-orders-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
