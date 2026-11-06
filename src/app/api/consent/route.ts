import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, rateLimitGuard, clientIp, str } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Pepper for IP hashing — a constant so consent records stay comparable across restarts. */
const CONSENT_IP_PEPPER = process.env.CONSENT_IP_PEPPER || 'biharse-consent-ip-pepper-v1';
const POLICY_VERSION = 'v1';

/**
 * POST /api/consent — DPDP Act 2023 proof-of-consent log.
 * Body: { analyticsOk: boolean, marketingOk: boolean, anonId?: string, email?: string }
 * - Session email (HttpOnly cookie) always wins over any body-supplied email.
 * - IP is stored only as sha256(ip + pepper); UA truncated; anonId is a client-generated
 *   random UUID (pseudonymous, non-PII).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'consent', 10, 60_000);
  if (limited) return limited;

  const b = (await req.json().catch(() => null)) as {
    analyticsOk?: unknown;
    marketingOk?: unknown;
    anonId?: unknown;
    email?: unknown;
    policyVersion?: unknown;
  } | null;

  if (!b || typeof b.analyticsOk !== 'boolean' || typeof b.marketingOk !== 'boolean') {
    return NextResponse.json({ error: 'analyticsOk and marketingOk booleans required' }, { status: 400 });
  }

  // Prefer the signed-in identity; ignore body email entirely otherwise (no anonymous PII).
  const session = await getSessionUser(req);
  const email = session ? session.email : '';
  const anonId = typeof b.anonId === 'string' ? b.anonId.slice(0, 64) : '';
  const policyVersion = typeof b.policyVersion === 'string' && b.policyVersion.length <= 10 ? b.policyVersion : POLICY_VERSION;

  const ipHash = createHash('sha256').update(`${clientIp(req)}:${CONSENT_IP_PEPPER}`).digest('hex').slice(0, 48);
  const userAgent = str(req.headers.get('user-agent') || '', 400);

  await db.consentLog.create({
    data: {
      email,
      anonId,
      analyticsOk: b.analyticsOk,
      marketingOk: b.marketingOk,
      policyVersion,
      ipHash,
      userAgent,
    },
  });

  return new NextResponse(null, { status: 204 });
}
