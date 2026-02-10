import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabase';

/**
 * Create or update a shared study set
 * POST /api/share - Create/update a shared set
 * GET /api/share?shareId=xxx - Get a shared set by ID
 * 
 * Uses the `flashcard_sets` table (same as /api/flashcard-sets).
 * Sets `share_id` and `is_shared = true` on the existing row.
 */

export async function POST(request: NextRequest) {
  try {
    const { studySet } = await request.json();

    if (!studySet) {
      return NextResponse.json({ error: 'Study set required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ 
        success: true, 
        shareId: studySet.shareId,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${studySet.shareId}`,
        reason: 'no_database'
      });
    }

    console.log(`[Share API] Sharing study set: ${studySet.id} with shareId: ${studySet.shareId}`);

    // Update the existing row in flashcard_sets to mark it as shared
    const { data, error } = await supabase
      .from('flashcard_sets')
      .update({
        share_id: studySet.shareId,
        is_shared: true,
      })
      .eq('id', studySet.id)
      .select()
      .single();

    if (error) {
      console.error(`[Share API] Error sharing study set ${studySet.id}:`, error);
      
      // If update fails (row doesn't exist in DB), try upsert as fallback
      const { data: upsertData, error: upsertError } = await supabase
        .from('flashcard_sets')
        .upsert({
          id: studySet.id,
          user_id: studySet.userId,
          name: studySet.name,
          subject: studySet.subject || null,
          grade: studySet.grade || null,
          cards: studySet.flashcards,
          share_id: studySet.shareId,
          is_shared: true,
          created_at: studySet.createdAt,
          last_studied: studySet.lastStudied || null
        }, { onConflict: 'id' })
        .select()
        .single();

      if (upsertError) {
        console.error(`[Share API] Upsert fallback also failed:`, upsertError);
        return NextResponse.json({ error: 'Failed to share study set' }, { status: 500 });
      }

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'}/share/${upsertData.share_id}`;
      return NextResponse.json({ success: true, shareId: upsertData.share_id, shareUrl });
    }

    console.log(`[Share API] Successfully shared set ${data.id} with shareId: ${data.share_id}`);

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

    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not configured',
        reason: 'no_database'
      }, { status: 503 });
    }

    console.log(`[Share API] Fetching shared set with shareId: ${shareId}`);

    // Query flashcard_sets table by share_id
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .eq('share_id', shareId)
      .single();

    if (error) {
      console.error(`[Share API] Query error for shareId ${shareId}:`, error);
      return NextResponse.json({ error: 'Study set not found' }, { status: 404 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Study set not found' }, { status: 404 });
    }

    console.log(`[Share API] Successfully found shared set: ${data.id}`);

    // Convert to FlashcardSet format (table uses `cards`, client expects `flashcards`)
    const flashcardSet = {
      id: data.id,
      name: data.name,
      flashcards: data.cards,
      createdAt: data.created_at,
      lastStudied: data.last_studied,
      shareId: data.share_id,
      userId: data.user_id,
      isShared: data.is_shared ?? true,
      subject: data.subject,
      grade: data.grade
    };

    return NextResponse.json({ studySet: flashcardSet });

  } catch (error) {
    console.error('Get shared set error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
