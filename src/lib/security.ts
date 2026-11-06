// Rate limiting (in-process token bucket), sessions, staff auth
import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import crypto from 'crypto';

type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: limit, last: now };
  const refill = ((now - b.last) / windowMs) * limit;
  b.tokens = Math.min(limit, b.tokens + refill);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function rateLimitGuard(req: NextRequest, name: string, limit: number, windowMs: number) {
  if (!rateLimit(`${name}:${clientIp(req)}`, limit, windowMs)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }
  return null;
}

/**
 * Named token buckets for PII-sensitive lookup endpoints (per-IP, in-process).
 * Pass `rateLimitGuard(req, 'track', RATE_BUCKETS.track.limit, RATE_BUCKETS.track.windowMs)`.
 */
export const RATE_BUCKETS = {
  track: { limit: 5, windowMs: 60_000 },
  invoice: { limit: 5, windowMs: 60_000 },
} as const;

/* ── Sessions ──────────────────────────────────────── */
const SESSION_COOKIE = 'bs_session';
const SESSION_DAYS = 30;

export async function createSession(customerId: string) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  // rotate: invalidate previous sessions for this customer
  await db.session.deleteMany({ where: { customerId } });
  await db.session.create({ data: { token, customerId, expiresAt } });
  return { token, expiresAt, maxAge: SESSION_DAYS * 24 * 3600 };
}

export function sessionCookie(token: string, maxAge: number) {
  const secure = process.env.SITE_URL?.startsWith('https') ? ' Secure;' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { customer: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.customer;
}

export const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'PACKING', 'SUPPORT'];

export async function requireStaff(req: NextRequest, scopes?: ('orders' | 'products' | 'settings' | 'inbox')[]) {
  const user = await getSessionUser(req);
  if (!user || !STAFF_ROLES.includes(user.role)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
  const role = user.role;
  const isOwner = role === 'OWNER' || role === 'ADMIN';
  if (scopes && !isOwner && role !== 'MANAGER') {
    // PACKING → orders only; SUPPORT → orders + inbox
    const allowed = role === 'PACKING' ? ['orders'] : role === 'SUPPORT' ? ['orders', 'inbox'] : [];
    const ok = scopes.every((s) => allowed.includes(s));
    if (!ok) return { error: NextResponse.json({ error: 'Forbidden for your role' }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function audit(actor: string, action: string, meta?: unknown) {
  await db.auditLog.create({ data: { actor, action, metaJson: JSON.stringify(meta ?? {}) } }).catch(() => {});
}

/* ── Validation helpers ────────────────────────────── */
export function str(v: unknown, max = 500): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
export function isPincode(v: string) {
  return /^\d{6}$/.test(v);
}
export function isPhone(v: string) {
  return /^[+\d][\d\s-]{8,15}$/.test(v);
}
export function sanitizeText(v: string) {
  return v.replace(/[<>]/g, '');
}
