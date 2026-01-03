import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Get the actual host from the request headers
  const host = request.headers.get('host') || '';
  const protocol = request.headers.get('x-forwarded-proto') || request.headers.get('x-proto') || 'https';
  
  // Build the origin from actual request headers
  const origin = `${protocol}://${host}`;
  
  console.log('[AUTH CALLBACK] Host:', host, 'Protocol:', protocol, 'Origin:', origin);

  if (code && supabaseUrl && supabaseAnonKey) {
    try {
      const cookieStore = await cookies();
      
      // Create a Supabase client with proper SSR support
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
      );

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[AUTH CALLBACK] Auth error:', error);
        return NextResponse.redirect(new URL('/?error=auth_failed', origin));
      }

      console.log('[AUTH CALLBACK] Success, redirecting to:', origin);
      // Successfully authenticated, redirect to home
      // The session is now set in cookies by Supabase
      revalidatePath('/', 'layout');
      // Redirect with a param to trigger page refresh on client
      const response = NextResponse.redirect(new URL('/?auth=success', origin));
      return response;
    } catch (error) {
      console.error('[AUTH CALLBACK] Exception:', error);
      return NextResponse.redirect(new URL('/?error=auth_exception', origin));
    }
  }

  // If no code, redirect to home with error
  console.log('[AUTH CALLBACK] No code provided');
  return NextResponse.redirect(new URL('/?error=no_code', origin));
}
