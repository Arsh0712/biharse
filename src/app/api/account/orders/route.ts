import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/security';
import { serializeOrder } from '@/lib/serialize-order';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const orders = await db.order.findMany({
    where: { OR: [{ customerId: user.id }, { email: user.email }] },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ orders: orders.map(serializeOrder) });
}
