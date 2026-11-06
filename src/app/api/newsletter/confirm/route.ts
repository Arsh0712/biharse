import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const row = await db.newsletterSubscriber.findUnique({ where: { token } });
  const siteUrl = process.env.SITE_URL || req.nextUrl.origin;

  if (!row) {
    return new NextResponse('<!doctype html><meta charset="utf-8"><body style="background:#FFF6E9;font-family:sans-serif;display:grid;place-items:center;height:100vh;"><p style="color:#3D1F12;">This confirmation link is invalid or expired.</p></body>', { headers: { 'Content-Type': 'text/html' } });
  }

  await db.newsletterSubscriber.update({ where: { id: row.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });

  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="3;url=${siteUrl}/?v=home&subscribed=1"><body style="background:#FFF6E9;font-family:Georgia,serif;display:grid;place-items:center;height:100vh;text-align:center;"><div><img src="${siteUrl}/brand/mandala.png" width="72" style="border-radius:50%" alt=""/><h1 style="color:#3D1F12;">Confirmed! 🪔</h1><p style="color:#7D6450;">You're on the BiharSe list — batch stories & Chhath reminders coming your way. Redirecting…</p></div></body>`, { headers: { 'Content-Type': 'text/html' } });
}
