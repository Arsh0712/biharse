import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, STAFF_ROLES } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Staff list (read-only) — anyone with a staff role; invitations are env-based. */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;

  const staff = await db.customer.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: { id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ staff: staff.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })) });
}
