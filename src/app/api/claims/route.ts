import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { queueEmail, templates } from '@/lib/email';
import { rateLimitGuard, str, isEmail, sanitizeText } from '@/lib/security';
import { mediaRoot } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const CLAIM_TYPES = new Set(['DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'MISSING', 'OTHER']);
const TYPE_LABEL: Record<string, string> = {
  DAMAGED: 'Damaged item',
  WRONG_ITEM: 'Wrong item',
  EXPIRED: 'Expired',
  MISSING: 'Something missing',
  OTHER: 'Other',
};
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function newClaimNumber() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return `CL-${s}`;
}

/** cuid-style filename (time-sortable + random) — no extra dependency needed */
function cuidish() {
  return `c${Date.now().toString(36)}${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * "Report a problem" — multipart claim for DELIVERED orders.
 * Files land under db/uploads/claims/ (staff-only via /api/claims/[id]/evidence);
 * a ContactMessage row mirrors the claim into the existing admin Inbox.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'claims', 3, 60 * 60 * 1000);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form submission' }, { status: 400 });
  }

  const orderNumber = str(form.get('orderNumber'), 32).toUpperCase();
  const email = str(form.get('email'), 200).toLowerCase();
  const type = str(form.get('type'), 20).toUpperCase();
  const description = sanitizeText(str(form.get('description'), 2000));

  if (!orderNumber) return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  if (!CLAIM_TYPES.has(type)) return NextResponse.json({ error: 'Please choose a problem type' }, { status: 400 });
  if (description.length < 10) return NextResponse.json({ error: 'Please describe the problem (at least 10 characters)' }, { status: 400 });

  const order = await db.order.findUnique({ where: { number: orderNumber } });
  if (!order || order.email !== email) {
    return NextResponse.json({ error: 'Order number and email do not match' }, { status: 403 });
  }
  if (order.status !== 'DELIVERED') {
    return NextResponse.json({ error: 'Claims open after delivery — this order has not been delivered yet' }, { status: 409 });
  }

  /* ── optional evidence photo (client previews, server enforces limits) ── */
  let evidencePath = '';
  let evidenceName = '';
  const photoField = form.get('photo');
  if (photoField && typeof photoField === 'object' && 'size' in photoField && (photoField as File).size > 0) {
    const photo = photoField as File;
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Photo must be under 5 MB' }, { status: 400 });
    }
    const ext = EXT_BY_MIME[photo.type];
    if (!ext) {
      return NextResponse.json({ error: 'Photo must be a PNG, JPG, WEBP or GIF image' }, { status: 400 });
    }
    const dir = path.join(mediaRoot(), 'claims');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${cuidish()}.${ext}`;
    const buf = Buffer.from(await photo.arrayBuffer());
    if (buf.byteLength > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Photo must be under 5 MB' }, { status: 400 });
    }
    await fs.writeFile(path.join(dir, filename), buf);
    evidencePath = path.join('db', 'uploads', 'claims', filename);
    evidenceName = filename;
  }

  /* ── unique claim number ── */
  let claimNumber = newClaimNumber();
  for (let i = 0; i < 5; i++) {
    const clash = await db.claim.findUnique({ where: { claimNumber } });
    if (!clash) break;
    claimNumber = newClaimNumber();
  }

  const claim = await db.claim.create({
    data: { claimNumber, orderNumber, email, type, description, evidencePath },
  });

  /* ── mirror into the admin Inbox (ContactMessage) so SUPPORT sees it immediately ── */
  let customerName = 'Customer';
  try { customerName = JSON.parse(order.addressJson)?.name || customerName; } catch { /* keep default */ }
  const evidenceUrlText = `/api/claims/${claim.id}/evidence`;
  const message = [
    description,
    '—',
    `Order: ${orderNumber}`,
    `Claim: ${claimNumber}`,
    `Type: ${TYPE_LABEL[type] ?? type}`,
    `Evidence file: ${evidenceName || 'none attached'}`,
    `Evidence (staff only): ${evidenceUrlText}`,
  ].join('\n');

  await db.contactMessage.create({
    data: {
      name: customerName,
      email,
      phone: order.phone || '',
      subject: `[Claim ${claimNumber}] ${TYPE_LABEL[type] ?? type}`,
      message,
    },
  });

  await queueEmail(email, templates.claimReceived(customerName, claimNumber, Boolean(evidenceName)), 'claimReceived').catch(() => {});

  return NextResponse.json({ ok: true, claimNumber });
}
