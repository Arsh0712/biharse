import { NextRequest, NextResponse } from 'next/server';
import { computeTotals, getSetting } from '@/lib/commerce';
import { rateLimitGuard } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Coupon validation — prices a cart server-side WITHOUT creating an order. */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'coupon', 20, 60 * 1000);
  if (limited) return limited;

  const { lines, couponCode } = (await req.json().catch(() => ({}))) as {
    lines?: { slug: string; variantLabel: string; qty: number }[];
    couponCode?: string;
  };
  if (!lines?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });

  const shippingCfg = await getSetting('shipping', { freeAbovePaise: 99900, flatPaise: 9900, defaultMinDays: 5, defaultMaxDays: 8 });
  const totals = await computeTotals({ lines, couponCode }, shippingCfg);
  if (!totals.ok) return NextResponse.json({ error: totals.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    discount: totals.discount,
    couponCode: totals.couponCode,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
  });
}
