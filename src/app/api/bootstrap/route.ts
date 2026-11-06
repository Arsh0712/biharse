import { NextResponse } from 'next/server';
import { db, ensureDbSeeded } from '@/lib/db';
import { getSettingsMap } from '@/lib/commerce';
import { paymentMode, publicKeyId } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureDbSeeded();
  const s = await getSettingsMap();
  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

  const years = await db.chhathYear.findMany({ orderBy: { year: 'asc' } });
  const now = new Date();
  const upcoming = years.find((y) => y.ushaArghya >= now) ?? null;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return NextResponse.json({
    announcement: s.announcement ?? null,
    hero: s.hero ?? null,
    business: s.business ?? null,
    shipping: s.shipping ?? { freeAbovePaise: 99900, flatPaise: 9900, defaultMinDays: 5, defaultMaxDays: 8 },
    flags: s.flags ?? { music: false, exitIntent: false, whatsapp: false, reviews: true },
    footer: s.footer ?? { signoff: 'Designed & Crafted with ❤️ in Bharat', tagHi: 'शुद्ध • पारंपरिक • विश्वसनीय' },
    categories,
    chhathUpcoming: upcoming,
    chhathAll: years,
    paymentMode: paymentMode(),
    razorpayKeyId: publicKeyId(),
    googleEnabled,
  });
}
