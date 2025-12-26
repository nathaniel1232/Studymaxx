import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabase';
import { getOrCreateUserId } from '@/app/utils/storage';

/**
 * Check if a user has premium access and their usage limits
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params or generate anonymous ID
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || getOrCreateUserId();

    // If no Supabase, use localStorage-based limits (client will handle)
    if (!supabase) {
      return NextResponse.json({
        isPremium: false,
        setsCreated: 0,
        maxSets: 1,
        canCreateMore: true, // Client will check localStorage
        reason: 'no_database'
      });
    }

    // Check if user exists in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_premium, sets_created, created_at')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // User doesn't exist - create them
    if (!userData) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          is_premium: false,
          sets_created: 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      return NextResponse.json({
        isPremium: false,
        setsCreated: 0,
        maxSets: 1,
        canCreateMore: true
      });
    }

    // Return user's premium status and limits
    const maxSets = userData.is_premium ? -1 : 1; // -1 means unlimited
    const canCreateMore = userData.is_premium || userData.sets_created < 1;

    return NextResponse.json({
      isPremium: userData.is_premium,
      setsCreated: userData.sets_created,
      maxSets,
      canCreateMore
    });

  } catch (error) {
    console.error('Premium check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
