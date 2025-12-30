import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials not configured");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Check if a user has premium access and their usage limits
 * NOW USES AUTHENTICATED USER ID
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

    console.log('[/api/premium/check] Checking user:', userId, user.email);

    // Check if user exists in database - use minimal query first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_premium, email')
      .eq('id', userId)
      .single();

    console.log('[/api/premium/check] Database query result:', { userData, userError });

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[/api/premium/check] Database error:', userError);
      
      // If table doesn't exist, treat as free user
      if (userError.code === 'PGRST205' || userError.code === '42P01') {
        console.warn('[/api/premium/check] Users table not found - treating as free user');
        return NextResponse.json({
          isPremium: false,
          setsCreated: 0,
          maxSets: 1,
          canCreateMore: true,
          dailyAiCount: 0,
          maxDailyAi: 1,
          needsSetup: true
        });
      }
      
      return NextResponse.json({ error: 'Database error', details: userError.message }, { status: 500 });
    }

    // User doesn't exist - create them with minimal fields
    if (!userData) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: user.email,
          is_premium: false
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        // If creation fails, still return free user status
        return NextResponse.json({
          isPremium: false,
          setsCreated: 0,
          maxSets: 1,
          canCreateMore: true,
          dailyAiCount: 0,
          maxDailyAi: 1
        });
      }

      return NextResponse.json({
        isPremium: false,
        setsCreated: 0,
        maxSets: 1,
        canCreateMore: true,
        dailyAiCount: 0,
        maxDailyAi: 1
      });
    }

    // Return user's premium status and limits
    const isPremium = userData.is_premium || false;
    const maxSets = isPremium ? -1 : 1; // -1 means unlimited
    const canCreateMore = isPremium || true; // Always allow at least one set

    return NextResponse.json({
      isPremium,
      setsCreated: 0, // Will be tracked when we have the column
      maxSets,
      canCreateMore,
      dailyAiCount: 0,
      maxDailyAi: isPremium ? -1 : 1
    });

  } catch (error) {
    console.error('Premium check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
