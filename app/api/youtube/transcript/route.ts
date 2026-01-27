/**
 * YouTube Transcript Extraction API
 * Fetches captions from YouTube videos for flashcard generation
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for faster responses
export const maxDuration = 30; // 30 seconds timeout

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export async function POST(req: NextRequest) {
  try {
    const { videoUrl } = await req.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoIdMatch = videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );

    if (!videoIdMatch) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const videoId = videoIdMatch[1];
    console.log(`[YouTube] Fetching transcript for: ${videoId}`);

    // Fetch the video page
    const pageResponse = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    if (!pageResponse.ok) {
      console.error('[YouTube] Failed to fetch page:', pageResponse.status);
      return NextResponse.json(
        { error: 'Could not fetch video page' },
        { status: 500 }
      );
    }

    const html = await pageResponse.text();

    // Extract caption tracks
    const captionsMatch = html.match(/"captionTracks":(\[.*?\])/);

    if (!captionsMatch) {
      return NextResponse.json(
        { error: 'This video has no captions available. Please try a video with subtitles.' },
        { status: 404 }
      );
    }

    let captionTracks;
    try {
      captionTracks = JSON.parse(captionsMatch[1]);
    } catch (e) {
      console.error('[YouTube] Failed to parse caption tracks:', e);
      return NextResponse.json(
        { error: 'Could not parse caption data' },
        { status: 500 }
      );
    }

    if (!captionTracks || captionTracks.length === 0) {
      return NextResponse.json(
        { error: 'This video has no captions available' },
        { status: 404 }
      );
    }

    // Find English track or use first available
    const englishTrack = captionTracks.find(
      (track: any) =>
        track.languageCode === 'en' || track.languageCode?.startsWith('en')
    );
    const captionTrack = englishTrack || captionTracks[0];

    console.log(`[YouTube] Using caption track: ${captionTrack.languageCode}`);

    // Fetch the caption XML
    const captionResponse = await fetch(captionTrack.baseUrl);

    if (!captionResponse.ok) {
      console.error('[YouTube] Failed to fetch captions:', captionResponse.status);
      return NextResponse.json(
        { error: 'Could not fetch caption data' },
        { status: 500 }
      );
    }

    const captionXml = await captionResponse.text();

    // Parse XML to extract text
    const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
    const transcript: string[] = [];

    for (const match of textMatches) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/<[^>]+>/g, '')
        .trim();

      if (text) {
        transcript.push(text);
      }
    }

    if (transcript.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract transcript text' },
        { status: 500 }
      );
    }

    const fullTranscript = transcript.join(' ');
    console.log(`[YouTube] Successfully extracted ${transcript.length} segments`);

    return NextResponse.json({
      success: true,
      transcript: fullTranscript,
      videoId: videoId,
      language: captionTrack.languageCode,
      segmentCount: transcript.length,
    });

  } catch (error: any) {
    console.error('[YouTube] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract transcript' },
      { status: 500 }
    );
  }
}
