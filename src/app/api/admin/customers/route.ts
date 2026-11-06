import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';
import { serializeOrder } from '@/lib/serialize-order';

export const dynamic = 'force-dynamic';

const PAID_SET = ['PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** GET list (q, page, perPage) — or ?id= for the customer detail drawer. */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['inbox']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const id = (sp.get('id') || '').trim();
  const q = (sp.get('q') || '').trim();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get('perPage')) || 50));

  if (id) {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        orders: { include: { items: true }, orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const [spentAgg, consents] = await Promise.all([
      db.order.aggregate({ where: { customerId: id, status: { in: PAID_SET } }, _sum: { total: true } }),
      db.consentLog.findMany({ where: { email: customer.email }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    const { passwordHash: _hash, ...profile } = customer;
    return NextResponse.json({
      customer: profile,
      addresses: customer.addresses,
      orders: customer.orders.map(serializeOrder),
      totalSpent: spentAgg._sum.total ?? 0,
      consentLogs: consents.map((c) => ({
        id: c.id, analyticsOk: c.analyticsOk, marketingOk: c.marketingOk, policyVersion: c.policyVersion, createdAt: c.createdAt.toISOString(),
      })),
    });
  }

  const where: Record<string, unknown> = q
    ? { OR: [{ email: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }] }
    : {};

  const [rows, total, spendByCustomer] = await Promise.all([
    db.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.customer.count({ where }),
    db.order.groupBy({ by: ['customerId'], where: { status: { in: PAID_SET }, customerId: { not: null } }, _sum: { total: true } }),
  ]);

  const spend = new Map(spendByCustomer.map((s) => [s.customerId, s._sum.total ?? 0]));

  return NextResponse.json({
    customers: rows.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      role: c.role,
      createdAt: c.createdAt.toISOString(),
      orderCount: c._count.orders,
      totalSpent: spend.get(c.id) ?? 0,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
  });
}
