import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clearSessionCookie } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('bs_session')?.value;
  if (token) await db.session.deleteMany({ where: { token } }).catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookie());
  return res;
}
