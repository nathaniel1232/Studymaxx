import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabase';

/**
 * Create or update a shared study set
 * POST /api/share - Create/update a shared set
 * GET /api/share?shareId=xxx - Get a shared set by ID
 */

export async function POST(request: NextRequest) {
  try {
    const { studySet } = await request.json();

    if (!studySet) {
      return NextResponse.json({ error: 'Study set required' }, { status: 400 });
    }

    // If no Supabase, use localStorage (handled client-side)
    if (!supabase) {
      return NextResponse.json({ 
        success: true, 
        shareId: studySet.shareId,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${studySet.shareId}`,
        reason: 'no_database'
      });
    }

    // Upsert to database
    const { data, error } = await supabase
      .from('study_sets')
      .upsert({
        id: studySet.id,
        user_id: studySet.userId,
        name: studySet.name,
        subject: studySet.subject || null,
        grade: studySet.grade || null,
        flashcards: studySet.flashcards,
        share_id: studySet.shareId,
        is_shared: true,
        created_at: studySet.createdAt,
        last_studied: studySet.lastStudied || null
      }, { 
        onConflict: 'id' 
      })
      .select()
      .single();

    if (error) {
      console.error('Error sharing study set:', error);
      return NextResponse.json({ error: 'Failed to share study set' }, { status: 500 });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'}/share/${data.share_id}`;
    
    return NextResponse.json({ 
      success: true, 
      shareId: data.share_id,
      shareUrl 
    });

  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 });
    }

    // If no Supabase, return error (client will use localStorage)
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not configured',
        reason: 'no_database'
      }, { status: 503 });
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('study_sets')
      .select('*')
      .eq('share_id', shareId)
      .eq('is_shared', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Study set not found' }, { status: 404 });
    }

    // Convert to FlashcardSet format
    const flashcardSet = {
      id: data.id,
      name: data.name,
      flashcards: data.flashcards,
      createdAt: data.created_at,
      lastStudied: data.last_studied,
      shareId: data.share_id,
      userId: data.user_id,
      isShared: data.is_shared,
      subject: data.subject,
      grade: data.grade
    };

    return NextResponse.json({ studySet: flashcardSet });

  } catch (error) {
    console.error('Get shared set error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
