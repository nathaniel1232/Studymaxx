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
 * GET - Fetch all flashcard sets for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Fetch user's flashcard sets
    // Try to select all columns first
    let query = supabase
      .from('flashcard_sets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: sets, error } = await query;

    // If error is about folder_id column, try without it
    if (error && error.message && error.message.includes('folder_id')) {
      console.warn('[API] folder_id column not found, retrying without it...');
      const { data: setsWithoutFolder, error: retryError } = await supabase
        .from('flashcard_sets')
        .select('id, user_id, name, cards, subject, grade, created_at, last_studied, study_count, is_shared, share_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (retryError) {
        console.error('Error fetching flashcard sets (retry):', retryError);
        console.error('Supabase error details:', JSON.stringify(retryError, null, 2));
        return NextResponse.json({ 
          error: 'Failed to fetch flashcard sets',
          details: retryError.message || 'Unknown database error'
        }, { status: 500 });
      }
      
      return NextResponse.json({ sets: setsWithoutFolder || [] });
    }

    if (error) {
      console.error('Error fetching flashcard sets:', error);
      console.error('Supabase error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to fetch flashcard sets',
        details: error.message || 'Unknown database error'
      }, { status: 500 });
    }

    return NextResponse.json({ sets: sets || [] });
  } catch (error) {
    console.error('Flashcard sets GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Create new flashcard set
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /flashcard-sets - Saving flashcard set...');
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      console.error('[API] No authorization header');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[API] Auth error:', authError);
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    console.log('[API] User authenticated:', user.id);

    const body = await request.json();
    const { name, cards, subject, grade, folderId } = body;

    if (!name || !cards || !Array.isArray(cards)) {
      console.error('[API] Invalid request body:', { name: !!name, cards: !!cards, isArray: Array.isArray(cards) });
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log('[API] Creating flashcard set:', { name, cardCount: cards.length, subject, grade, folderId });

    // Create flashcard set
    const { data: newSet, error } = await supabase
      .from('flashcard_sets')
      .insert({
        user_id: user.id,
        name,
        cards,
        subject: subject || null,
        grade: grade || null,
        folder_id: folderId || null,
        study_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[API] ❌ Error creating flashcard set:', error);
      console.error('[API] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to create flashcard set',
        details: error.message || 'Unknown database error'
      }, { status: 500 });
    }

    console.log('[API] ✅ Flashcard set created successfully:', newSet.id);
    return NextResponse.json({ set: newSet });
  } catch (error) {
    console.error('[API] ❌ Flashcard sets POST error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

/**
 * DELETE - Delete a flashcard set
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('id');

    if (!setId) {
      return NextResponse.json({ error: 'Missing set ID' }, { status: 400 });
    }

    // Delete flashcard set (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting flashcard set:', error);
      return NextResponse.json({ error: 'Failed to delete flashcard set' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flashcard sets DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT - Update a flashcard set (for last_studied, study_count, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const body = await request.json();
    const { id, last_studied, study_count, folder_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing set ID' }, { status: 400 });
    }

    const updates: any = {};
    if (last_studied !== undefined) updates.last_studied = last_studied;
    if (study_count !== undefined) updates.study_count = study_count;
    if (folder_id !== undefined) updates.folder_id = folder_id;

    // Update flashcard set
    const { data: updatedSet, error } = await supabase
      .from('flashcard_sets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating flashcard set:', error);
      return NextResponse.json({ error: 'Failed to update flashcard set' }, { status: 500 });
    }

    return NextResponse.json({ set: updatedSet });
  } catch (error) {
    console.error('Flashcard sets PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
