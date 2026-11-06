import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Forward-only claim workflow (server also validates). */
const TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ['REVIEWING', 'APPROVED', 'REJECTED'],
  REVIEWING: ['APPROVED', 'REJECTED'],
  APPROVED: ['RESOLVED'],
  REJECTED: ['RESOLVED'],
  RESOLVED: [],
};

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['inbox']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const status = (sp.get('status') || 'all').trim();
  const where: Record<string, unknown> = status && status !== 'all' ? { status } : {};
  const claims = await db.claim.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ claims });
}

interface ClaimPatch {
  id: string;
  status?: string;
  refundAmount?: number; // paise
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['inbox']);
  if (error) return error;

  const b = (await req.json().catch(() => ({}))) as ClaimPatch;
  if (!b.id) return NextResponse.json({ error: 'Claim id required' }, { status: 400 });

  const claim = await db.claim.findUnique({ where: { id: b.id } });
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (b.status !== undefined && b.status !== claim.status) {
    const allowed = TRANSITIONS[claim.status] ?? [];
    if (!allowed.includes(b.status)) {
      return NextResponse.json({ error: `A ${claim.status.toLowerCase()} claim can only move to: ${allowed.join(', ') || 'nowhere'}` }, { status: 400 });
    }
    data.status = b.status;
    if (b.status === 'APPROVED') {
      const refund = Math.round(Number(b.refundAmount));
      const effective = refund > 0 ? refund : claim.refundAmount;
      if (!effective || effective <= 0) {
        return NextResponse.json({ error: 'An approved claim needs a refund amount (₹)' }, { status: 400 });
      }
      data.refundAmount = effective;
    }
  } else if (typeof b.refundAmount === 'number') {
    // amount-only tweak while still OPEN/REVIEWING (pre-approval note)
    const refund = Math.round(Number(b.refundAmount));
    if (refund < 0) return NextResponse.json({ error: 'Refund amount must be non-negative' }, { status: 400 });
    data.refundAmount = refund;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, unchanged: true });

  const updated = await db.claim.update({ where: { id: claim.id }, data });
  await audit(user.email, 'claim.update', {
    claim: claim.claimNumber,
    from: claim.status,
    to: updated.status,
    refundAmount: updated.refundAmount,
  });
  return NextResponse.json({ claim: updated });
}
