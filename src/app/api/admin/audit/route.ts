import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** GET audit trail — newest first, optional actor filter, paginated. */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const actor = (sp.get('actor') || '').trim();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get('perPage')) || 50));

  const where: Record<string, unknown> = actor ? { actor: { contains: actor } } : {};

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({ id: r.id, actor: r.actor, action: r.action, metaJson: r.metaJson, createdAt: r.createdAt.toISOString() })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
  });
}
