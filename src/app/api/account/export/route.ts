import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, rateLimitGuard } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account/export — DPDP Act 2023 right to access / data portability.
 * Returns the signed-in customer's own data as a downloadable JSON attachment.
 * Only ever the requesting customer's records — never another user's PII.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimitGuard(req, 'export', 5, 60_000);
  if (limited) return limited;

  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const [orders, addresses, reviews, wishlist, consentLogs] = await Promise.all([
    db.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    db.address.findMany({ where: { customerId: user.id }, orderBy: { createdAt: 'desc' } }),
    db.review.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { slug: true, nameEn: true } } },
    }),
    db.wishlistItem.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { slug: true, nameEn: true } } },
    }),
    db.consentLog.findMany({
      where: { email: user.email },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    policyNote: 'Provided under India\u2019s DPDP Act 2023 — right to access (Section 11). This file contains every personal data point BiharSe holds about you.',
    profile: {
      email: user.email,
      name: user.name,
      phone: user.phone,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
    },
    orders: orders.map((o) => ({
      number: o.number,
      status: o.status,
      createdAt: o.createdAt,
      subtotalPaise: o.subtotal,
      discountPaise: o.discount,
      shippingPaise: o.shipping,
      totalPaise: o.total,
      paymentMethod: o.paymentMethod,
      trackingNumber: o.trackingNumber || null,
      items: o.items.map((i) => ({
        slug: i.slug,
        name: i.nameEn,
        variant: i.variantLabel,
        weightG: i.weightG,
        qty: i.qty,
        unitPricePaise: i.unitPrice,
        lineTotalPaise: i.lineTotal,
      })),
    })),
    addresses: addresses.map((a) => ({
      label: a.label,
      name: a.name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.isDefault,
      createdAt: a.createdAt,
    })),
    reviews: reviews.map((r) => ({
      product: r.product.slug,
      productName: r.product.nameEn,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt,
    })),
    wishlist: wishlist.map((w) => ({
      slug: w.product.slug,
      productName: w.product.nameEn,
      addedAt: w.createdAt,
    })),
    consentLogs: consentLogs.map((c) => ({
      analyticsOk: c.analyticsOk,
      marketingOk: c.marketingOk,
      policyVersion: c.policyVersion,
      recordedAt: c.createdAt,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="biharse-my-data.json"',
      'Cache-Control': 'no-store',
    },
  });
}
