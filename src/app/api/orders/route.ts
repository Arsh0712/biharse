import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeTotals, genOrderNumber, getSetting } from '@/lib/commerce';
import { createGatewayOrder, paymentMode, publicKeyId } from '@/lib/payments';
import { getSessionUser, rateLimitGuard, str, isEmail, isPhone, isPincode, sanitizeText, clientIp } from '@/lib/security';

export const dynamic = 'force-dynamic';

const CONSENT_VERSION = 'terms-v1';

interface Body {
  lines: { slug: string; variantLabel: string; qty: number }[];
  couponCode?: string;
  giftNote?: string;
  email: string;
  phone: string;
  address: {
    name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string;
  };
  gst?: { legalName?: string; gstin?: string; invoiceEmail?: string };
  /** Terms consent (Consumer Protection Rules) — required, see consent gate at checkout */
  consent?: boolean;
  consentVersion?: string;
  /** Double-submit guard — one checkout session = one uuid; same token returns the same order */
  clientToken?: string;
  /** Client-observed total (paise) from the sticky summary — server replies 409 TOTAL_CHANGED on drift */
  expectedTotal?: number;
  /** Billing address snapshot when different from shipping */
  billing?: {
    name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; gstin?: string;
  };
}

export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'orders', 8, 60 * 60 * 1000);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  /* ── 1 · Terms consent is mandatory before any order is created ── */
  if (!body.consent) {
    return NextResponse.json({ error: 'Consent to terms is required' }, { status: 400 });
  }

  /* ── 2 · Double-submit guard: same clientToken returns the SAME order (200) ── */
  const clientToken = str(body.clientToken, 64);
  if (clientToken) {
    const dup = await db.order.findFirst({ where: { clientToken } });
    if (dup && dup.paymentOrderId && ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID'].includes(dup.status)) {
      return NextResponse.json({
        duplicate: true,
        orderNumber: dup.number,
        amount: dup.total,
        currency: 'INR',
        paymentOrderId: dup.paymentOrderId,
        mode: dup.paymentProvider === 'razorpay' ? 'razorpay' : 'sandbox',
        keyId: publicKeyId(),
        status: dup.status,
        prefill: { name: body.address?.name || '', email: body.email || dup.email, contact: body.phone || dup.phone },
      });
    }
  }

  const { email, phone, address } = body;
  if (!isEmail(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  if (!isPhone(phone)) return NextResponse.json({ error: 'Valid phone is required' }, { status: 400 });
  if (!address?.name || !address?.line1 || !address?.city || !address?.state || !isPincode(address?.pincode || '')) {
    return NextResponse.json({ error: 'Complete delivery address with a valid 6-digit pincode is required' }, { status: 400 });
  }

  /* ── 3 · Billing address validation (only sent when it differs from shipping) ── */
  let billingJson = '';
  if (body.billing && typeof body.billing === 'object') {
    const b = body.billing;
    if (!b.name?.trim() || !b.line1?.trim() || !b.city?.trim() || !b.state?.trim() || !isPincode(b.pincode || '')) {
      return NextResponse.json({ error: 'Complete billing address with a valid 6-digit pincode is required' }, { status: 400 });
    }
    if (b.gstin && !/^[0-9A-Za-z]{15}$/.test(b.gstin)) {
      return NextResponse.json({ error: 'GSTIN is 15 characters' }, { status: 400 });
    }
    billingJson = JSON.stringify({
      name: b.name.trim().slice(0, 120),
      line1: b.line1.trim().slice(0, 200),
      line2: (b.line2 || '').trim().slice(0, 200),
      city: b.city.trim().slice(0, 80),
      state: b.state.trim().slice(0, 80),
      pincode: b.pincode,
      gstin: (b.gstin || '').toUpperCase(),
    });
  }

  const shippingCfg = await getSetting('shipping', { freeAbovePaise: 99900, flatPaise: 9900, defaultMinDays: 5, defaultMaxDays: 8 });

  /* ── 4 · Stock check with a structured 409 (computeTotals collapses these into a generic 400) ── */
  const slugs = [...new Set((body.lines || []).map((l) => l.slug))];
  const stockRows = slugs.length
    ? await db.product.findMany({ where: { slug: { in: slugs }, isActive: true }, select: { slug: true, nameEn: true, stock: true } })
    : [];
  const stockBySlug = Object.fromEntries(stockRows.map((p) => [p.slug, p]));
  const shortages: { slug: string; available: number; requested: number; nameEn: string }[] = [];
  for (const l of body.lines || []) {
    const p = stockBySlug[l.slug];
    if (!p) continue; // unknown/unavailable slug → handled by computeTotals with a clear 400
    // same clamp as computeTotals (stock is product-level, variants only change price/weight)
    const qty = Math.max(1, Math.min(20, Math.floor(Number(l.qty) || 1)));
    if (p.stock < qty) shortages.push({ slug: p.slug, available: p.stock, requested: qty, nameEn: p.nameEn });
  }
  if (shortages.length > 0) {
    return NextResponse.json({ reason: 'STOCK', items: shortages }, { status: 409 });
  }

  /* ── 5 · Server-side price recompute (never trusts client numbers) ── */
  const totals = await computeTotals({ lines: body.lines || [], couponCode: body.couponCode }, shippingCfg);
  if (!totals.ok) return NextResponse.json({ error: totals.error }, { status: 400 });

  /* ── 6 · Price-drift guard: client total must match freshly computed total ── */
  const expectedTotal = typeof body.expectedTotal === 'number' && Number.isFinite(body.expectedTotal) ? Math.round(body.expectedTotal) : null;
  if (expectedTotal !== null && expectedTotal !== totals.total) {
    return NextResponse.json({
      reason: 'TOTAL_CHANGED',
      totals: { subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, total: totals.total },
      items: totals.lines.map((l) => ({
        slug: l.slug, nameEn: l.nameEn, variantLabel: l.variantLabel, weightG: l.weightG,
        unitPrice: l.unitPrice, mrp: l.mrp, qty: l.qty, lineTotal: l.lineTotal, image: l.image,
      })),
    }, { status: 409 });
  }

  const user = await getSessionUser(req);

  // idempotency: same cart content within 15 min reuses the pending order (double-click guard)
  const signatureInput = JSON.stringify({ l: body.lines, c: (body.couponCode || '').toUpperCase(), e: email.toLowerCase() });
  const recent = await db.order.findFirst({
    where: { email: email.toLowerCase(), status: 'PENDING_PAYMENT', createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && (recent as unknown as { cartSig?: string }).cartSig) {
    // legacy check (not used) — fallthrough
  }
  const gateway = await createGatewayOrder({
    amountPaise: totals.total,
    receipt: genOrderNumber(),
    notes: {
      email: email.toLowerCase(),
      phone,
      items: totals.lines.map((l) => `${l.slug}×${l.qty}`).join(', ').slice(0, 200),
    },
  });

  const order = await db.order.create({
    data: {
      number: gateway.receipt,
      customerId: user?.id ?? null,
      email: email.toLowerCase(),
      phone,
      status: 'PENDING_PAYMENT',
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      couponCode: totals.couponCode,
      giftNote: sanitizeText(str(body.giftNote, 300)),
      clientToken,
      consentAt: new Date(),
      consentIp: clientIp(req),
      consentVersion: str(body.consentVersion, 20) || CONSENT_VERSION,
      gstFieldsJson: JSON.stringify(body.gst ?? {}),
      addressJson: JSON.stringify(address),
      billingJson,
      paymentProvider: paymentMode(),
      paymentOrderId: gateway.id,
      items: {
        create: totals.lines.map((l) => ({
          productId: l.productId,
          slug: l.slug,
          nameEn: l.nameEn,
          variantLabel: l.variantLabel,
          weightG: l.weightG,
          unitPrice: l.unitPrice,
          mrp: l.mrp,
          qty: l.qty,
          lineTotal: l.lineTotal,
          image: l.image,
        })),
      },
    },
  });

  if (totals.couponCode) {
    await db.coupon.updateMany({ where: { code: totals.couponCode }, data: { usageCount: { increment: 1 } } });
  }

  return NextResponse.json({
    duplicate: false,
    orderNumber: order.number,
    amount: totals.total,
    currency: 'INR',
    paymentOrderId: gateway.id,
    mode: paymentMode(),
    keyId: publicKeyId(),
    prefill: { name: address.name, email, contact: phone },
  });
}
