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
 * Increment the user's study_set_count
 * Called after successfully creating a study set
 * NOW USES AUTHENTICATED USER ID
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Verify token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 });
    }

    const userId = user.id;

    // First get the current value
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('study_set_count')
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
        study_set_count: (userData?.study_set_count || 0) + 1
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error incrementing study_set_count:', error);
      return NextResponse.json({ error: 'Failed to update counter' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      setsCreated: data.study_set_count 
    });

  } catch (error) {
    console.error('Increment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
