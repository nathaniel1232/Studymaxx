/**
 * DEBUG ENDPOINT - Check what's happening with premium status
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({
        error: 'Not authenticated',
        hasAuthHeader: false
      });
    }

    // Check with SERVICE ROLE KEY
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid token',
        authError: authError?.message
      });
    }

    // Try to read from database
    const { data: userData, error: dbError } = await supabaseServiceRole
      .from('users')
      .select('id, email, is_premium, daily_ai_count, last_ai_reset')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      userId: user.id,
      userEmail: user.email,
      userData: userData,
      dbError: dbError ? {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details
      } : null,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
