import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
  });
}
