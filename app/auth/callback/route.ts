import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // In a real implementation, you would exchange the code for a session
    // with Supabase Auth here. For now, just redirect to home.
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  // If no code, redirect to home with error
  return NextResponse.redirect(new URL('/?error=auth_failed', requestUrl.origin));
}
