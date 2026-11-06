// Email engine — branded templates, SMTP via nodemailer when configured,
// honest Outbox logging otherwise. Retry queue + failure logging.
import { db } from './db';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import crypto from 'crypto';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'BiharSe';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER || 'no-reply@biharse.org';
export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

let transporter: Transporter | null = null;
function getTransport() {
  if (!SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const BRAND_URL = `${SITE_URL}/brand/mandala.png`;

function shell(title: string, bodyHtml: string, opts?: { preheader?: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF6E9;font-family:Georgia,'Times New Roman',serif;color:#1C130B;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts?.preheader ?? ''}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6E9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFDF7;border:1px solid rgba(109,58,34,0.16);border-radius:20px;overflow:hidden;">
  <tr><td style="background:#3D1F12;padding:28px 36px;" align="center">
    <img src="${BRAND_URL}" width="52" height="52" alt="BiharSe mandala" style="border-radius:50%;display:inline-block;vertical-align:middle;">
    <span style="color:#FFF6E9;font-size:24px;font-weight:800;font-family:Arial,Helvetica,sans-serif;margin-left:12px;vertical-align:middle;">bihar<span style="color:#D80018">se</span></span>
    <div style="color:#F0A81C;font-size:13px;margin-top:8px;font-family:Arial,Helvetica,sans-serif;">शुद्ध • पारंपरिक • विश्वसनीय</div>
  </td></tr>
  <tr><td style="padding:36px;">
    <h1 style="margin:0 0 18px;font-size:26px;color:#3D1F12;">${title}</h1>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:22px 36px 34px;border-top:1px solid rgba(109,58,34,0.14);" align="center">
    <div style="color:#7D6450;font-size:12.5px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
      BiharSe · Block H, House 158, Mangol Puri, New Delhi 110083<br>
      support@biharse.org · <a href="${SITE_URL}" style="color:#D80018;">biharse.org</a><br>
      <span style="font-size:12px;">धन्यवाद! Designed &amp; Crafted with ❤️ in Bharat</span>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

const p = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export const templates = {
  otp(email: string, code: string) {
    return {
      subject: `${code} is your BiharSe login code`,
      html: shell('Your one-time code', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Namaste! Use this code to sign in to BiharSe. It expires in 10 minutes.</p>
        <div style="text-align:center;margin:28px 0;"><span style="display:inline-block;background:#FFF6E9;border:2px dashed #D80018;color:#D80018;font-size:34px;letter-spacing:0.35em;font-weight:800;font-family:Arial,Helvetica,sans-serif;padding:14px 26px;border-radius:14px;">${code}</span></div>
        <p style="font-size:13px;color:#7D6450;">If you didn't request this, you can safely ignore this email.</p>`, { preheader: `Your BiharSe login code: ${code}` }),
      text: `Your BiharSe login code: ${code} (expires in 10 minutes).`,
    };
  },
  welcome(name: string) {
    return {
      subject: 'Welcome to BiharSe — the taste of home awaits',
      html: shell(`Namaste, ${name}!`, `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">You're part of the family now. Every batch we fry carries माटी की खुशबू — Bihar's heritage in every bite.</p>
        <p style="text-align:center;margin:26px 0;"><a href="${SITE_URL}" style="background:#D80018;color:#FFF6E9;padding:13px 30px;border-radius:99px;text-decoration:none;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Order Fresh Thekua</a></p>
        <p style="font-size:13px;color:#7D6450;">Use code <b>BIHARSE15</b> for 15% off your first order.</p>`),
      text: `Welcome to BiharSe! Use code BIHARSE15 for 15% off.`,
    };
  },
  orderConfirmation(name: string, orderNumber: string, total: number, items: { nameEn: string; variantLabel: string; qty: number; lineTotal: number; mrp?: number; gstRate?: number }[]) {
    const paise = (v: number) => Math.round(v);
    const rows = items.map((i) => {
      // per-line GST breakdown when the payload carries the slab (GST is included in the listed price)
      const gstAmount = typeof i.gstRate === 'number' && i.gstRate > 0 ? paise(i.lineTotal - i.lineTotal / (1 + i.gstRate / 100)) : 0;
      const gstNote = gstAmount > 0 ? `<span style="color:#7D6450;font-size:11.5px;"> · incl. GST ${p(gstAmount)} (${i.gstRate}%)</span>` : '';
      const mrpNote = typeof i.mrp === 'number' && i.mrp > 0 && i.mrp * i.qty > i.lineTotal
        ? `<span style="color:#999;text-decoration:line-through;font-size:11.5px;">MRP ${p(i.mrp * i.qty)}</span> `
        : '';
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;">${i.nameEn} ${i.variantLabel ? `<span style="color:#7D6450;">· ${i.variantLabel}</span>` : ''}<b style="float:right;">×${i.qty} ${p(i.lineTotal)}</b><br>${mrpNote}${gstNote}</td></tr>`;
    }).join('');
    // Honest GST statement — "5% slab on packaged snacks" only when every line is 5%; otherwise generic.
    const rates = items.map((i) => i.gstRate).filter((r): r is number => typeof r === 'number' && r > 0);
    const gstSummary = items.length > 0 && rates.length === items.length && rates.every((r) => r === 5)
      ? 'Includes GST in listed prices — 5% slab on packaged snacks (HSN 1905).'
      : 'Includes GST in listed prices at applicable slab rates (HSN 1905 · baked goods).';
    return {
      subject: `Order ${orderNumber} confirmed — fresh batch reserved for you`,
      html: shell(`Order confirmed, ${name}!`, `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Your order <b>${orderNumber}</b> is confirmed and queued for our next small batch. You'll get shipping updates by email.</p>
        <table style="width:100%;margin:20px 0;">${rows}
        <tr><td style="padding:12px 0;font-size:16px;"><b>Total ${p(total)}</b></td></tr>
        <tr><td style="padding:2px 0 0;font-size:12px;color:#7D6450;">${gstSummary}</td></tr></table>
        <p style="font-size:13px;color:#7D6450;">Freshly prepared · Hygienically packed · Delivered across India in 5–8 days.</p>
        <p style="text-align:center;margin:22px 0;"><a href="${SITE_URL}/?v=track&order=${orderNumber}" style="background:#3D1F12;color:#FFF6E9;padding:12px 26px;border-radius:99px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Track your order</a></p>`),
      text: `Order ${orderNumber} confirmed. Total ${p(total)}. ${gstSummary} Track at ${SITE_URL}/?v=track&order=${orderNumber}`,
    };
  },
  paymentFailed(orderNumber: string) {
    return {
      subject: `Payment for ${orderNumber} didn't go through`,
      html: shell('Payment unsuccessful', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Your payment for <b>${orderNumber}</b> failed or was cancelled. No money was captured. Your cart items are saved — you can retry in a click.</p>
        <p style="text-align:center;margin:24px 0;"><a href="${SITE_URL}/?v=checkout" style="background:#D80018;color:#FFF6E9;padding:13px 30px;border-radius:99px;text-decoration:none;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Retry payment</a></p>`),
      text: `Payment for ${orderNumber} failed. Retry at ${SITE_URL}/?v=checkout`,
    };
  },
  shipped(name: string, orderNumber: string, courier: string, trackingNumber: string) {
    const trackUrl = trackingNumber ? `https://shiprocket.co/tracking/${trackingNumber}` : SITE_URL;
    return {
      subject: `Order ${orderNumber} is on its way 🚚`,
      html: shell('Shipped!', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Namaste ${name}, your fresh batch has left our kitchen with <b>${courier || 'our delivery partner'}</b>.</p>
        <p style="font-size:15px;">Tracking number: <b>${trackingNumber || '—'}</b></p>
        <p style="text-align:center;margin:24px 0;"><a href="${trackUrl}" style="background:#3D1F12;color:#FFF6E9;padding:12px 28px;border-radius:99px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Track shipment</a></p>`),
      text: `Order ${orderNumber} shipped via ${courier}. Tracking: ${trackingNumber}`,
    };
  },
  delivered(name: string, orderNumber: string) {
    return {
      subject: 'Delivered! How was the taste of home? 💛',
      html: shell('Delivered — enjoy!', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Your order <b>${orderNumber}</b> has arrived. Store in an airtight container to keep that fresh-batch crisp.</p>
        <p style="font-size:15px;">If every bite felt like home, tell the world (and us):</p>
        <p style="text-align:center;margin:24px 0;"><a href="${SITE_URL}/?v=shop" style="background:#D80018;color:#FFF6E9;padding:13px 30px;border-radius:99px;text-decoration:none;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Write a review</a></p>`),
      text: `Order ${orderNumber} delivered. We'd love a review!`,
    };
  },
  refundProcessed(name: string, orderNumber: string, amount: number) {
    return {
      subject: `Refund processed for ${orderNumber}`,
      html: shell('Refund processed', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Namaste ${name}, we've refunded <b>${p(amount)}</b> for order <b>${orderNumber}</b> to your original payment method. Banks typically reflect it in 3–5 working days.</p>
        <p style="font-size:14px;color:#7D6450;">We're sorry this one didn't work out — the mandala will always welcome you back.</p>`),
      text: `Refund of ${p(amount)} processed for order ${orderNumber}.`,
    };
  },
  /** Bilingual cancellation note — customer-initiated cancel, with the refund timeline. */
  orderCancelled(name: string, orderNumber: string, refundInitiated: boolean) {
    const refundLineEn = refundInitiated
      ? `Your refund for the full amount has been initiated to your original payment method. It reflects in <b>5–7 working days</b> — depending on your bank.`
      : `Your refund for the full amount will be processed manually to your original payment method within <b>5–7 working days</b>. You'll receive a confirmation email when it is on its way.`;
    const refundLineHi = refundInitiated
      ? `आपकी रिफ़ंड राशि आपके मूल भुगतान माध्यम में <b>5–7 कार्य दिवस</b> में वापस आ जाएगी।`
      : `आपका रिफ़ंड <b>5–7 कार्य दिवस</b> के भीतर मैन्युअल रूप से संसाधित होगा — पुष्टि के लिए ईमेल मिलेगा।`;
    return {
      subject: `Order ${orderNumber} cancelled — refund within 5–7 working days`,
      html: shell(`Order cancelled, ${name}`, `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Namaste ${name}, your order <b>${orderNumber}</b> has been cancelled as requested — आपका ऑर्डर रद्द कर दिया गया है।</p>
        <div style="background:#FFF6E9;border:1px solid rgba(109,58,34,0.16);border-radius:14px;padding:16px 20px;margin:20px 0;">
          <p style="margin:0;font-size:14.5px;line-height:1.7;color:#3D1F12;">${refundLineEn}</p>
          <p style="margin:8px 0 0;font-size:13.5px;line-height:1.7;color:#7D6450;">${refundLineHi}</p>
        </div>
        <p style="font-size:13.5px;line-height:1.7;color:#5a4632;">Need help or changed your mind? Write to us at <a href="mailto:support@biharse.org" style="color:#D80018;">support@biharse.org</a> — we reply within one working day.</p>
        <p style="text-align:center;margin:24px 0;"><a href="${SITE_URL}/?v=shop" style="background:#D80018;color:#FFF6E9;padding:13px 30px;border-radius:99px;text-decoration:none;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Order fresh again</a></p>`),
      text: `Order ${orderNumber} cancelled. ${refundInitiated ? 'Refund initiated' : 'Refund will be processed manually'} — expect it in 5–7 working days. Support: support@biharse.org`,
    };
  },
  /** Claim acknowledgement — sets the 48h SLA expectation, notes the evidence file. */
  claimReceived(name: string, claimNumber: string, evidenceAttached: boolean) {
    const evidenceLine = evidenceAttached
      ? `The photo you attached has been added to your claim file.`
      : `You can reply to this email to add photos or more details to your claim.`;
    return {
      subject: `We've received your claim ${claimNumber} — BiharSe`,
      html: shell(`Claim received — ${claimNumber}`, `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Namaste ${name}, thank you for telling us. Your claim <b>${claimNumber}</b> is logged and our team has picked it up.</p>
        <div style="background:#FFF6E9;border:1px solid rgba(109,58,34,0.16);border-radius:14px;padding:16px 20px;margin:20px 0;">
          <p style="margin:0;font-size:14.5px;line-height:1.7;color:#3D1F12;"><b>We reply within 48 hours.</b> ${evidenceLine}</p>
          <p style="margin:8px 0 0;font-size:13.5px;line-height:1.7;color:#7D6450;">हम 48 घंटों के भीतर जवाब देते हैं — आपकी समस्या को गंभीरता से लिया जा रहा है।</p>
        </div>
        <p style="font-size:13.5px;line-height:1.7;color:#5a4632;">Keep your claim number handy — we'll use it in every update. Questions in the meantime? <a href="mailto:support@biharse.org" style="color:#D80018;">support@biharse.org</a></p>`),
      text: `Claim ${claimNumber} received. We reply within 48 hours. ${evidenceLine} Support: support@biharse.org`,
    };
  },
  contactReply(name: string) {
    return {
      subject: 'We received your message — BiharSe',
      html: shell(`Thank you, ${name}!`, `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Your message has reached our kitchen counter. We reply within one working day — usually much faster, between batches.</p>
        <p style="font-size:14px;color:#7D6450;">अपना स्नेह बनाए रखें — Team BiharSe</p>`),
      text: `Thank you for contacting BiharSe. We reply within one working day.`,
    };
  },
  adminNewOrder(orderNumber: string, name: string, total: number, count: number) {
    return {
      subject: `🔔 New order ${orderNumber} — ${p(total)}`,
      html: shell('New order received', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;"><b>${name}</b> placed order <b>${orderNumber}</b> with ${count} item(s) worth <b>${p(total)}</b>.</p>
        <p style="text-align:center;margin:22px 0;"><a href="${SITE_URL}/?v=admin" style="background:#3D1F12;color:#FFF6E9;padding:12px 26px;border-radius:99px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">Open Admin</a></p>`),
      text: `New order ${orderNumber} — ${p(total)} (${count} items).`,
    };
  },
  newsletterConfirm(token: string) {
    return {
      subject: 'Confirm your BiharSe subscription',
      html: shell('One click to confirm', `
        <p style="font-size:15px;line-height:1.7;color:#5a4632;">Confirm your subscription for batch stories, festival reminders (Chhath dates!) and early access to seasonal hampers.</p>
        <p style="text-align:center;margin:24px 0;"><a href="${SITE_URL}/api/newsletter/confirm?token=${token}" style="background:#D80018;color:#FFF6E9;padding:13px 30px;border-radius:99px;text-decoration:none;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Confirm subscription</a></p>`),
      text: `Confirm: ${SITE_URL}/api/newsletter/confirm?token=${token}`,
    };
  },
  testOk() {
    return {
      subject: 'BiharSe SMTP test — it works!',
      html: shell('SMTP configured correctly', `<p style="font-size:15px;line-height:1.7;color:#5a4632;">This is a test email from your BiharSe admin. If you're reading it in your inbox, SMTP is configured correctly.</p>`),
      text: 'BiharSe SMTP test email.',
    };
  },
};

export async function queueEmail(to: string, tpl: { subject: string; html: string; text: string }, templateName: string) {
  const row = await db.emailOutbox.create({
    data: { toEmail: to, template: templateName, subject: tpl.subject, html: tpl.html, text: tpl.text, status: 'QUEUED' },
  });
  await attemptSend(row.id);
}

export async function attemptSend(outboxId: string) {
  const row = await db.emailOutbox.findUnique({ where: { id: outboxId } });
  if (!row) return { ok: false };
  const tx = getTransport();
  if (!tx) {
    // No SMTP configured → honest LOGGED state, viewable in admin Outbox
    await db.emailOutbox.update({ where: { id: outboxId }, data: { status: 'LOGGED', provider: 'LOG' } });
    return { ok: true, logged: true };
  }
  try {
    await tx.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: row.toEmail,
      subject: row.subject,
      html: row.html,
      text: row.text,
      replyTo: process.env.SMTP_REPLY_TO || undefined,
    });
    await db.emailOutbox.update({ where: { id: outboxId }, data: { status: 'SENT', sentAt: new Date(), attempts: row.attempts + 1 } });
    return { ok: true };
  } catch (err) {
    await db.emailOutbox.update({
      where: { id: outboxId },
      data: { status: 'FAILED', error: String(err).slice(0, 500), attempts: row.attempts + 1 },
    });
    return { ok: false };
  }
}

export async function retryFailed(limit = 10) {
  const rows = await db.emailOutbox.findMany({ where: { status: 'FAILED' }, take: limit, orderBy: { createdAt: 'desc' } });
  for (const r of rows) await attemptSend(r.id);
}

export function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}
