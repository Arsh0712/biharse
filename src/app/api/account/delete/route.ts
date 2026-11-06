import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, rateLimitGuard, clearSessionCookie, audit } from '@/lib/security';

export const dynamic = 'force-dynamic';

const SCRUB_NOTE = 'removed under DPDP request';

/**
 * POST /api/account/delete — DPDP Act 2023 right to erasure (Sec. 12).
 * Requires { confirm: 'DELETE' } in the body.
 *
 * Behaviour:
 * - Customer PII scrubbed (name/phone/email/googleId/passwordHash) — the row survives only as a
 *   financial shell so order foreign keys stay intact.
 * - Order rows are KEPT (tax & accounting retention per published policy) but their personal
 *   snapshots (email/phone/addressJson/billingJson/gstFieldsJson) are scrubbed; totals, status
 *   and items stay for accounting.
 * - Sessions, addresses, wishlist items and OTP rows are deleted; reviews are scrubbed to
 *   'Deleted user' so community content keeps its shape without PII.
 * - ConsentLogs and AuditLogs are retained (legal obligation / legitimate records).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitGuard(req, 'account-delete', 5, 60_000);
  if (limited) return limited;

  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (b.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm account deletion' }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    // 1. Orders — keep financial rows, scrub personal snapshots
    await tx.order.updateMany({
      where: { customerId: user.id },
      data: {
        email: SCRUB_NOTE,
        phone: SCRUB_NOTE,
        addressJson: SCRUB_NOTE,
        billingJson: SCRUB_NOTE,
        gstFieldsJson: '',
      },
    });

    // 2. Direct identifiers & related rows
    await tx.session.deleteMany({ where: { customerId: user.id } });
    await tx.address.deleteMany({ where: { customerId: user.id } });
    await tx.wishlistItem.deleteMany({ where: { customerId: user.id } });
    await tx.otpCode.deleteMany({ where: { OR: [{ customerId: user.id }, { email: user.email }] } });

    // 3. Reviews — scrub author, keep content (community integrity without PII)
    await tx.review.updateMany({
      where: { customerId: user.id },
      data: { name: 'Deleted user', city: '' },
    });

    // 4. The customer row itself — scrubbed, kept as a shell for order FK integrity
    await tx.customer.update({
      where: { id: user.id },
      data: {
        name: 'Deleted user',
        phone: '',
        email: `deleted+${user.id}@invalid.local`,
        googleId: '',
        passwordHash: '',
        emailVerified: false,
      },
    });
  });

  // ConsentLogs intentionally retained — proof that consent existed and when it was withdrawn.
  await audit(`customer:${user.id}`, 'ACCOUNT_DELETED', {
    message: 'PII scrubbed; order financials retained per published retention policy (DPDP Act 2023)',
    customerId: user.id,
  });

  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookie());
  return res;
}
