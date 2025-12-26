import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabase';

/**
 * Increment the user's sets_created count
 * Called after successfully creating a study set
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // If no Supabase, return success (client handles localStorage)
    if (!supabase) {
      return NextResponse.json({ success: true, reason: 'no_database' });
    }

    // Increment sets_created using RPC or fetch current and increment
    // First get the current value
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('sets_created')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }

    // Now increment and update
    const { data, error } = await supabase
      .from('users')
      .update({ 
        sets_created: (userData?.sets_created || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error incrementing sets_created:', error);
      return NextResponse.json({ error: 'Failed to update counter' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      setsCreated: data.sets_created 
    });

  } catch (error) {
    console.error('Increment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
