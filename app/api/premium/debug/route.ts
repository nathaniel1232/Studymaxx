/**
 * DEBUG ENDPOINT - Full diagnostic info
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const info: any = {
      timestamp: new Date().toISOString(),
      envVars: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET ✅' : 'MISSING ❌',
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceRoleKeyStatus: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✅' : 'MISSING ❌',
      }
    };

    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      info.auth = { error: 'No Authorization header' };
      return NextResponse.json(info);
    }

    // Try to create Supabase client
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        info.supabaseClient = { error: 'Missing environment variables' };
        return NextResponse.json(info);
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      info.supabaseClient = { status: 'Created ✅' };

      // Try to get user
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError) {
        info.auth = { error: authError.message };
        return NextResponse.json(info);
      }

      info.auth = { userId: user?.id, email: user?.email, status: 'Valid ✅' };

      // Try to query database
      try {
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('id, email, is_premium')
          .eq('id', user?.id)
          .single();

        if (dbError) {
          info.database = {
            error: dbError.message,
            code: dbError.code,
            details: dbError.details
          };
        } else {
          info.database = { 
            status: 'Query successful ✅',
            data: userData
          };
        }
      } catch (dbErr: any) {
        info.database = { error: dbErr.message };
      }

    } catch (err: any) {
      info.supabaseClient = { error: err.message };
    }

    return NextResponse.json(info);

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
}

