import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Bell aggregation — new orders, review holds, low stock, claims, failed emails, inbox. */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['orders']);
  if (error) return error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);

  const [ordersToday, pendingConfirmations, paymentReview, paymentFailed, lowStockProducts, openClaims, staleClaims, failedEmails, newMessages] =
    await Promise.all([
      db.order.count({ where: { status: { in: ['PAID', 'PACKING'] }, createdAt: { gte: startOfDay } } }),
      db.order.count({ where: { status: 'PAID' } }),
      db.order.count({ where: { status: 'PAYMENT_REVIEW' } }),
      db.order.count({ where: { status: 'PAYMENT_FAILED' } }),
      db.product.findMany({ where: { isActive: true }, select: { slug: true, nameEn: true, stock: true, lowStockAt: true } }),
      db.claim.findMany({ where: { status: { in: ['OPEN', 'REVIEWING'] } }, orderBy: { createdAt: 'asc' }, take: 8 }),
      db.claim.count({ where: { status: { in: ['OPEN', 'REVIEWING'] }, createdAt: { lt: twoDaysAgo } } }),
      db.emailOutbox.count({ where: { status: 'FAILED' } }),
      db.contactMessage.count({ where: { status: 'NEW' } }),
    ]);

  const lowStock = lowStockProducts.filter((p) => p.stock <= p.lowStockAt);

  return NextResponse.json({
    ordersToday,
    pendingConfirmations,
    paymentReview,
    paymentFailed,
    lowStock: lowStock.slice(0, 8).map((p) => ({ slug: p.slug, nameEn: p.nameEn, stock: p.stock, lowStockAt: p.lowStockAt })),
    lowStockCount: lowStock.length,
    openClaims: openClaims.map((c) => ({ id: c.id, claimNumber: c.claimNumber, orderNumber: c.orderNumber, type: c.type, status: c.status, createdAt: c.createdAt.toISOString() })),
    openClaimsCount: openClaims.length,
    staleClaimsCount: staleClaims,
    failedEmails,
    newMessages,
  });
}
