import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSetting } from '@/lib/commerce';
import { rateLimitGuard, isPincode, str } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Instant delivery-date estimate by pincode (seeded rules + India-wide default). */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'delivery', 20, 60 * 1000);
  if (limited) return limited;

  const { pincode } = (await req.json().catch(() => ({}))) as { pincode?: string };
  const pin = str(pincode, 6);
  if (!isPincode(pin)) return NextResponse.json({ error: 'Enter a valid 6-digit pincode' }, { status: 400 });

  const cfg = await getSetting('shipping', { freeAbovePaise: 99900, flatPaise: 9900, defaultMinDays: 5, defaultMaxDays: 8 });

  const row = await db.pincodeEstimate.findUnique({ where: { pincode: pin } });
  if (!row || !row.serviceable) {
    // India-wide promise
    const eta = addDays(new Date(), cfg.defaultMinDays);
    const eta2 = addDays(new Date(), cfg.defaultMaxDays);
    return NextResponse.json({
      serviceable: true,
      city: '',
      state: '',
      minDays: cfg.defaultMinDays,
      maxDays: cfg.defaultMaxDays,
      etaLabel: `${fmt(eta)} – ${fmt(eta2)}`,
    });
  }

  const eta = addDays(new Date(), row.minDays);
  const eta2 = addDays(new Date(), row.maxDays);
  return NextResponse.json({
    serviceable: true,
    city: row.city,
    state: row.state,
    minDays: row.minDays,
    maxDays: row.maxDays,
    etaLabel: `${fmt(eta)} – ${fmt(eta2)}`,
  });
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function fmt(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
