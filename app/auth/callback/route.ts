import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

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
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/?error=auth_failed', origin));
      }

      // Successfully authenticated, redirect to home
      return NextResponse.redirect(new URL('/', origin));
    } catch (error) {
      console.error('Auth callback exception:', error);
      return NextResponse.redirect(new URL('/?error=auth_exception', origin));
    }
  }

  // If no code, redirect to home with error
  return NextResponse.redirect(new URL('/?error=no_code', origin));
}
