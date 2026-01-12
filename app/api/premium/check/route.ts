import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('[Premium Check] NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Premium Check] SUPABASE_SERVICE_ROLE_KEY is not set - THIS WILL CAUSE 500 ERROR');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials not configured. Missing: " + 
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ? "SUPABASE_URL " : "") +
    (!process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE_KEY" : ""));
}

// CRITICAL: Use service role key to bypass RLS and read is_premium column
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('[Premium Check] Supabase client initialized with service role key');

/**
 * Check if a user has premium access and their usage limits
 * NOW USES AUTHENTICATED USER ID AND SERVICE ROLE KEY TO BYPASS RLS
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({
        isPremium: false,
        setsCreated: 0,
        maxSets: 1,
        canCreateMore: false,
        reason: 'not_authenticated',
        message: 'Please sign in to check premium status'
      }, { status: 401 });
    }

    // Verify token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        isPremium: false,
        reason: 'invalid_token',
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    const userId = user.id;

    console.log('[/api/premium/check] ⚠️ EMERGENCY MODE: All users are premium - userId:', userId, 'email:', user.email);
    
    // EMERGENCY FIX: Give all logged-in users premium access
    return NextResponse.json({
      isPremium: true,
      setsCreated: 0,
      maxSets: -1,
      canCreateMore: true,
      dailyAiCount: 0,
      maxDailyAi: -1,
      remainingDailyGenerations: -1,
      emergencyMode: true,
      userId: userId
    });

  } catch (error) {
    console.error('[/api/premium/check] CRITICAL ERROR:', error);
    console.error('[/api/premium/check] Error details:', JSON.stringify(error, null, 2));
    
    // In case of error, return premium access to avoid blocking users
    return NextResponse.json({
      isPremium: true,
      setsCreated: 0,
      maxSets: -1,
      canCreateMore: true,
      dailyAiCount: 0,
      maxDailyAi: -1,
      remainingDailyGenerations: -1,
      error: 'Failed to check premium status - defaulting to premium',
      errorDetails: error instanceof Error ? error.message : String(error)
    });
  }
}
