import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(cookie => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Check if this is the OAuth callback route
  if (request.nextUrl.pathname === '/auth/callback') {
    const code = request.nextUrl.searchParams.get('code');
    
    if (code) {
      console.log('[MIDDLEWARE] Found auth code, exchanging for session');
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('[MIDDLEWARE] Code exchange failed:', error);
        } else {
          console.log('[MIDDLEWARE] Code exchange successful, session set');
        }
      } catch (error) {
        console.error('[MIDDLEWARE] Exception during code exchange:', error);
      }
    }
  }

  // Refresh user session if valid refresh token exists
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    // no user, potentially respond by redirecting the user to the login page
  }

  return response;
}
