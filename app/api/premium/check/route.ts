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

    // 1. Get user data (premium status + grandfathered status)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_premium, stripe_subscription_id, is_grandfathered')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[/api/premium/check] Error fetching user data:', userError);
      console.error('[/api/premium/check] User ID:', userId);
    }

    console.log('[/api/premium/check] Raw userData from DB:', JSON.stringify(userData, null, 2));
    console.log('[/api/premium/check] userData?.is_premium:', userData?.is_premium);
    console.log('[/api/premium/check] Type:', typeof userData?.is_premium);

    // 2. Count actual flashcard sets
    const { count: setsCount, error: countError } = await supabase
      .from('flashcard_sets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('[/api/premium/check] Error counting sets:', countError);
    }

    const isPremium = userData?.is_premium || false;
    const isGrandfathered = userData?.is_grandfathered || false;
    const subscriptionTier = isPremium ? 'pro' : 'free';
    const setsCreated = setsCount || 0;
    
    console.log('[/api/premium/check] ================================');
    console.log('[/api/premium/check] PREMIUM CHECK RESULT:');
    console.log('[/api/premium/check] isPremium:', isPremium, '(type:', typeof isPremium, ')');
    console.log('[/api/premium/check] subscriptionTier:', subscriptionTier);
    console.log('[/api/premium/check] setsCreated:', setsCreated);
    console.log('[/api/premium/check] ================================');
    
    // Limits
    const MAX_FREE_SETS = 2;
    const MAX_FREE_DAILY = 2;
    
    // Determine if user can create more sets
    const canCreateMore = isPremium ? true : (setsCreated < MAX_FREE_SETS);

    console.log(`[/api/premium/check] User ${userId} | Premium: ${isPremium} | Tier: ${subscriptionTier} | Sets: ${setsCreated}/${isPremium ? 'unlimited' : MAX_FREE_SETS}`);

    return NextResponse.json({
      isGrandfathered: isGrandfathered,
      isPremium: isPremium,
      subscriptionTier: subscriptionTier,
      setsCreated: setsCreated,
      maxSets: isPremium ? -1 : MAX_FREE_SETS,
      canCreateMore: canCreateMore,
      // Pass stored daily usage if we had it, or 0 for now as it's client-tracked mostly
      dailyAiCount: 0, 
      maxDailyAi: isPremium ? -1 : MAX_FREE_DAILY,
      remainingDailyGenerations: isPremium ? -1 : MAX_FREE_DAILY,
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
