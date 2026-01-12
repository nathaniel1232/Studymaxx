/**
 * DEBUG - Show user's premium status
 * GET /api/user/premium-status
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({
        error: 'Not authenticated',
        hasAuth: false
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid token',
        authError: authError?.message
      });
    }

    console.log('[Premium Status] Checking user:', user.id, user.email);

    // Query database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, email, is_premium, created_at')
      .eq('id', user.id)
      .single();

    console.log('[Premium Status] Database response:', { userData, dbError });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      database: {
        found: !!userData,
        is_premium: userData?.is_premium || false,
        created_at: userData?.created_at,
        error: dbError ? {
          message: dbError.message,
          code: dbError.code
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
}
