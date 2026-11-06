import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimitGuard, RATE_BUCKETS } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Print-ready GST invoice (HTML) — documented deviation: HTML invoice instead of binary PDF.
 * PII-sensitive: requires `?email=` matching the order email (case-insensitive); anything
 * else gets a generic 404 so invoice URLs cannot be guessed/enumerated. Rate limited per IP
 * (token bucket 'invoice', 5/60s).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const tb = RATE_BUCKETS.invoice;
  const limited = rateLimitGuard(req, 'invoice', tb.limit, tb.windowMs);
  if (limited) return limited;

  const { number } = await params;
  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  const order = await db.order.findUnique({ where: { number: number.toUpperCase() }, include: { items: true } });
  // Identical generic response for "no such order" and "email doesn't match" — no enumeration.
  if (!order || !email || order.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'No order found' }, { status: 404 });
  }

  let address: { name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; phone?: string } = {};
  let gst: { legalName?: string; gstin?: string } = {};
  try { address = JSON.parse(order.addressJson); } catch { /* noop */ }
  try { gst = JSON.parse(order.gstFieldsJson); } catch { /* noop */ }

  const p = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`;
  const rows = order.items.map((i) => `
    <tr><td>${i.nameEn}${i.variantLabel ? ` · ${i.variantLabel}` : ''}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${p(i.unitPrice)}</td><td style="text-align:right">${p(i.lineTotal)}</td></tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.number}</title>
<style>body{font-family:Georgia,serif;color:#1C130B;background:#FFF6E9;padding:40px}
.sheet{max-width:720px;margin:auto;background:#FFFDF7;border:1px solid rgba(109,58,34,.16);border-radius:16px;padding:40px}
h1{color:#3D1F12;margin:0}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{padding:10px 8px;border-bottom:1px solid #eee;font-size:14px}
th{text-align:left;color:#6B3A22;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.tot td{border:0;font-weight:700}.muted{color:#7D6450;font-size:12px}.brand{color:#D80018}</style></head><body>
<div class="sheet">
<div style="display:flex;justify-content:space-between;align-items:center">
<div><img src="/brand/mandala.png" width="48" style="border-radius:50%;vertical-align:middle" alt="BiharSe"/><b style="font-size:22px;margin-left:10px;vertical-align:middle">bihar<span class="brand">se</span></b></div>
<div class="muted">TAX INVOICE<br>${order.number}<br>${new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
</div>
<hr style="border:0;border-top:1px solid rgba(109,58,34,.2);margin:18px 0">
<p style="font-size:13px"><b>Sold by:</b> BiharSe · Block H, House 158, Mangol Puri, New Delhi 110083 · support@biharse.org${process.env.GSTIN ? ` · GSTIN: ${process.env.GSTIN}` : ''}</p>
<p style="font-size:13px"><b>Billed & shipped to:</b> ${address.name || order.email}<br>${address.line1 || ''}${address.line2 ? `, ${address.line2}` : ''}, ${address.city || ''}, ${address.state || ''} — ${address.pincode || ''} · ${order.phone}</p>
${gst.gstin ? `<p style="font-size:13px"><b>Purchase GSTIN:</b> ${gst.gstin}${gst.legalName ? ` (${gst.legalName})` : ''}</p>` : ''}
<table><thead><tr><th>Item (HSN 1905)</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${rows}
<tr class="tot"><td colspan="2"></td><td>Subtotal</td><td style="text-align:right">${p(order.subtotal)}</td></tr>
${order.discount ? `<tr class="tot"><td colspan="2"></td><td>Discount ${order.couponCode ? `(${order.couponCode})` : ''}</td><td style="text-align:right">−${p(order.discount)}</td></tr>` : ''}
<tr class="tot"><td colspan="2"></td><td>Shipping</td><td style="text-align:right">${order.shipping ? p(order.shipping) : 'FREE'}</td></tr>
<tr class="tot"><td colspan="2"></td><td><b>Total paid</b> (incl. GST)</td><td style="text-align:right">${p(order.total)}</td></tr>
</tbody></table>
<p class="muted">GST is included in the listed price at applicable slab rates (HSN 1905 – baked goods). Payment: ${order.paymentProvider === 'razorpay' ? 'Razorpay' : 'Sandbox checkout'} · Payment ID: ${order.paymentId || order.paymentOrderId || '—'}.</p>
<p class="muted" style="text-align:center">शुद्ध • पारंपरिक • विश्वसनीय — Designed &amp; Crafted with ❤️ in Bharat</p>
</div></body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
