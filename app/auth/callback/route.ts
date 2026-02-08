import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const state = requestUrl.searchParams.get('state');

  // Get the origin
  const host = request.headers.get('host') || '';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${protocol}://${host}`;

  console.log('[AUTH CALLBACK]', {
    url: request.url,
    code: code ? 'present' : 'missing',
    error,
    error_description,
    host,
    protocol,
    origin,
    state: state ? 'present' : 'missing',
    isNetworkHost: /^\d+\.\d+\.\d+\.\d+/.test(host)
  });
  
  // Warn if network host
  if (/^\d+\.\d+\.\d+\.\d+/.test(host)) {
    console.warn('[AUTH CALLBACK] ⚠️ Network host detected:', origin);
    console.warn('[AUTH CALLBACK] Make sure this URL is added to Supabase and Google Cloud Console!');
  }

  // Check for OAuth errors from Google/Supabase
  if (error) {
    console.error('[AUTH CALLBACK] OAuth error:', error, error_description);
    const errorUrl = new URL('/', origin);
    errorUrl.searchParams.set('error', error);
    if (error_description) {
      errorUrl.searchParams.set('error_description', error_description);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    console.error('[AUTH CALLBACK] No code provided');
    const errorUrl = new URL('/', origin);
    errorUrl.searchParams.set('error', 'no_code');
    return NextResponse.redirect(errorUrl);
  }

  // Check if this is an email verification (has 'type=signup' in state)
  // Only show welcome message for NEW signups, not regular logins
  const isEmailVerification = state?.includes('type=signup') || false;
  
  console.log('[AUTH CALLBACK] Code received, middleware will exchange it. Is new signup:', isEmailVerification);
  const successUrl = new URL('/', origin);
  successUrl.searchParams.set('auth', 'success');
  
  // Only add verified flag for actual email verifications, not OAuth logins
  if (isEmailVerification) {
    successUrl.searchParams.set('verified', 'true');
  }
  
  const response = NextResponse.redirect(successUrl);
  return response;
}
