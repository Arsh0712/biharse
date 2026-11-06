import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, sessionCookie } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** Google OAuth callback — verifies state, exchanges code, links by verified email. */
export async function GET(req: NextRequest) {
  const siteUrl = process.env.SITE_URL || req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieState = req.cookies.get('bs_oauth_state')?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${siteUrl}/?v=home&google=state_error`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${siteUrl}/?v=home&google=unconfigured`);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${siteUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(`${siteUrl}/?v=home&google=token_error`);
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return NextResponse.redirect(`${siteUrl}/?v=home&google=token_error`);

  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return NextResponse.redirect(`${siteUrl}/?v=home&google=profile_error`);
  const profile = (await infoRes.json()) as { sub: string; email: string; email_verified: boolean; name?: string; picture?: string };

  if (!profile.email_verified) return NextResponse.redirect(`${siteUrl}/?v=home&google=email_unverified`);
  const email = profile.email.toLowerCase();

  // link by verified email, create if new
  let customer = await db.customer.findUnique({ where: { email } });
  if (!customer) {
    customer = await db.customer.create({
      data: { email, name: profile.name || email.split('@')[0], googleId: profile.sub, emailVerified: true },
    });
  } else {
    customer = await db.customer.update({
      where: { id: customer.id },
      data: { googleId: customer.googleId || profile.sub, emailVerified: true },
    });
  }

  const session = await createSession(customer.id);
  const res = NextResponse.redirect(`${siteUrl}/?v=home&google=ok`);
  res.cookies.set('bs_oauth_state', '', { path: '/', maxAge: 0 });
  res.headers.append('Set-Cookie', sessionCookie(session.token, session.maxAge));
  return res;
}
