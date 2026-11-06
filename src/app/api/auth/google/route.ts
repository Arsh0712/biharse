import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Google OAuth 2.0 — starts the code flow when credentials are configured. */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const siteUrl = process.env.SITE_URL || req.nextUrl.origin;
  if (!clientId) {
    return NextResponse.redirect(`${siteUrl}/?v=home&google=unconfigured`);
  }
  const redirectUri = `${siteUrl}/api/auth/google/callback`;
  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  res.cookies.set('bs_oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
  return res;
}
