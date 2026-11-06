import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaff, audit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(req, ['settings']);
  if (error) return error;
  const years = await db.chhathYear.findMany({ orderBy: { year: 'asc' } });
  return NextResponse.json({ years });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireStaff(req, ['settings']);
  if (error) return error;

  const { year, nahayKhay, kharna, sandhyaArghya, ushaArghya, note } = (await req.json().catch(() => ({}))) as Record<string, string | number>;
  const y = Number(year);
  if (!y || !nahayKhay || !kharna || !sandhyaArghya || !ushaArghya) {
    return NextResponse.json({ error: 'year and all four dates required' }, { status: 400 });
  }

  await db.chhathYear.upsert({
    where: { year: y },
    update: { nahayKhay: new Date(nahayKhay), kharna: new Date(kharna), sandhyaArghya: new Date(sandhyaArghya), ushaArghya: new Date(ushaArghya), note: String(note ?? '') },
    create: { year: y, nahayKhay: new Date(nahayKhay), kharna: new Date(kharna), sandhyaArghya: new Date(sandhyaArghya), ushaArghya: new Date(ushaArghya), note: String(note ?? '') },
  });

  await audit(user.email, 'chhath.update', { year: y });
  return NextResponse.json({ ok: true });
}
