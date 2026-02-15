import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET — load saved summaries for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('summaries')
      .select('id, title, summary, source_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Summaries GET] Error:', error);
      return NextResponse.json({ summaries: [] });
    }

    return NextResponse.json({ summaries: data || [] });
  } catch (err: any) {
    console.error('[Summaries GET] Error:', err?.message);
    return NextResponse.json({ summaries: [] });
  }
}

// POST — save a new summary
export async function POST(request: NextRequest) {
  try {
    const { userId, title, summary, sourceType } = await request.json();

    if (!userId || !summary) {
      return NextResponse.json({ error: 'userId and summary required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('summaries')
      .insert({
        user_id: userId,
        title: (title || 'Untitled').substring(0, 500),
        summary: summary.substring(0, 50000),
        source_type: sourceType || 'text',
      })
      .select('id, title, summary, source_type, created_at')
      .single();

    if (error) {
      console.error('[Summaries POST] Error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ summary: data });
  } catch (err: any) {
    console.error('[Summaries POST] Error:', err?.message);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// DELETE — delete a summary
export async function DELETE(request: NextRequest) {
  try {
    const { id, userId } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: 'id and userId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[Summaries DELETE] Error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Summaries DELETE] Error:', err?.message);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
