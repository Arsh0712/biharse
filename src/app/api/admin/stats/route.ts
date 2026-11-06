import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['orders']);
  if (error) return error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [paidAll, paidToday, pendingAll, products, lowStock, abandoned, topProductsRaw, revenueByDay] = await Promise.all([
    db.order.findMany({ where: { status: { in: ['PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } }, select: { total: true, couponCode: true } }),
    db.order.findMany({ where: { status: { in: ['PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] }, createdAt: { gte: startOfDay } }, select: { total: true } }),
    db.order.findMany({ where: { status: 'PENDING_PAYMENT' }, select: { total: true, createdAt: true, email: true, number: true } }),
    db.product.findMany({ select: { slug: true, nameEn: true, stock: true, lowStockAt: true } }),
    null,
    null,
    db.orderItem.groupBy({ by: ['slug', 'nameEn'], _sum: { qty: true, lineTotal: true }, _count: true, orderBy: { _sum: { qty: 'desc' } }, take: 5 }),
    db.$queryRaw<{ day: string; total: number; cnt: number }[]>`SELECT strftime('%Y-%m-%d', createdAt) as day, SUM(total) as total, COUNT(*) as cnt FROM "Order" WHERE status IN ('PAID','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED') AND createdAt >= datetime('now','-13 days') GROUP BY day ORDER BY day`,
  ]);

  const revenue = paidAll.reduce((a, o) => a + o.total, 0);
  const revenueToday = paidToday.reduce((a, o) => a + o.total, 0);
  const lowStockList = products.filter((p) => p.stock <= p.lowStockAt);
  const pendingPayment = pendingAll.filter((o) => Date.now() - new Date(o.createdAt).getTime() > 15 * 60 * 1000);

  const messages = await db.contactMessage.findMany({ where: { status: 'NEW' }, take: 5, orderBy: { createdAt: 'desc' } });
  const reviewsPending = await db.review.count({ where: { approved: false } });
  const subscribers = await db.newsletterSubscriber.count({ where: { status: 'CONFIRMED' } });
  const outboxFailed = await db.emailOutbox.count({ where: { status: 'FAILED' } });

  return NextResponse.json({
    revenue,
    revenueToday,
    ordersToday: paidToday.length,
    ordersAll: paidAll.length,
    couponUses: paidAll.filter((o) => o.couponCode).length,
    pendingPaymentCount: pendingPayment.length,
    abandonedCarts: pendingPayment.map((o) => ({ number: o.number, email: o.email, total: o.total, minutes: Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000) })),
    lowStock: lowStockList.map((p) => ({ slug: p.slug, nameEn: p.nameEn, stock: p.stock, lowStockAt: p.lowStockAt })),
    topProducts: topProductsRaw.map((t) => ({ slug: t.slug, nameEn: t.nameEn, qty: t._sum.qty ?? 0, revenue: t._sum.lineTotal ?? 0 })),
    revenueByDay: revenueByDay.map((r) => ({ day: r.day, total: r.total, count: r.cnt })),
    newMessages: messages.length,
    reviewsPending,
    subscribers,
    outboxFailed,
  });
}
