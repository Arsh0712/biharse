import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeOrder } from '@/lib/serialize-order';
import { rateLimitGuard, RATE_BUCKETS } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Order lookup — PII-sensitive. The checkout email is REQUIRED and must match the
 * order (case-insensitive); missing email → 400, no match → a generic 404 so order
 * numbers cannot be enumerated. Rate limited per IP (token bucket 'track', 5/60s).
 */
export async function GET(req: NextRequest) {
  const tb = RATE_BUCKETS.track;
  const limited = rateLimitGuard(req, 'track', tb.limit, tb.windowMs);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const number = (sp.get('number') || '').trim();
  const email = (sp.get('email') || '').trim().toLowerCase();
  if (!number) return NextResponse.json({ error: 'Order number required' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Email is required to look up an order' }, { status: 400 });

  const order = await db.order.findUnique({
    where: { number: number.toUpperCase() },
    include: { items: true },
  });
  // Identical generic response for "no such order" and "email doesn't match" — no enumeration.
  if (!order || order.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'No order found' }, { status: 404 });
  }

  return NextResponse.json({ order: serializeOrder(order) });
}
