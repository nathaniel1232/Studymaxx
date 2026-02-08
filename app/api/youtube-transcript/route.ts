import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract video ID from URL
    let videoId = '';
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      }
    } catch {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    console.log('[YouTube API] Fetching transcript for video:', videoId);

    const transcriptMethods = [
      // Method 1: YouTube InnerTube Android API (most reliable, bypasses GDPR/consent)
      async () => {
        console.log('[YouTube API] Trying InnerTube Android API...');
        const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'ANDROID',
                clientVersion: '19.09.37',
                androidSdkVersion: 30,
                hl: 'en',
                gl: 'US',
              }
            },
            videoId: videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          })
        });

        if (!playerRes.ok) throw new Error(`Player API returned ${playerRes.status}`);
        
        const playerData = await playerRes.json();
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!captions || captions.length === 0) throw new Error('No caption tracks found');

        // Prefer English, then auto-generated English, then first track
        const track = captions.find((t: any) => t.languageCode === 'en' && !t.kind) || 
                      captions.find((t: any) => t.languageCode === 'en') || 
                      captions[0];
        
        const captionUrl = track.baseUrl;
        if (!captionUrl) throw new Error('No caption URL');

        const captionRes = await fetch(captionUrl, {
          headers: {
            'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
          }
        });

        const captionXml = await captionRes.text();
        if (!captionXml || captionXml.length === 0) throw new Error('Empty caption response');

        // Parse XML captions - handle both <text> and <p> formats
        let textMatches = captionXml.match(/<text[^>]*>(.*?)<\/text>/gs);
        if (!textMatches) {
          textMatches = captionXml.match(/<p[^>]*>(.*?)<\/p>/gs);
        }
        if (!textMatches) throw new Error('No text found in caption XML');

        const text = textMatches
          .map((match: string) => {
            return match
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/\[.*?\]/g, '') // Remove [♪♪♪] music markers
              .trim();
          })
          .filter((t: string) => t.length > 0)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        return text;
      },

      // Method 2: youtube-transcript npm package
      async () => {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        if (!transcriptItems || transcriptItems.length === 0) throw new Error('No transcript from npm package');
        return transcriptItems.map((item: any) => item.text).join(' ').trim();
      },

      // Method 3: Scrape YouTube page + fetch captions with consent cookie
      async () => {
        const watchPage = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': 'CONSENT=PENDING+999'
          }
        });
        const html = await watchPage.text();
        
        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (!captionMatch) throw new Error('No captions found on page');
        
        const captionTracks = JSON.parse(captionMatch[1]);
        if (!captionTracks || captionTracks.length === 0) throw new Error('No caption tracks');
        
        const track = captionTracks.find((t: any) => t.languageCode === 'en') || captionTracks[0];
        let captionUrl = track.baseUrl;
        captionUrl = captionUrl.replace(/\\u0026/g, '&');
        
        const captionResponse = await fetch(captionUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });
        const captionXml = await captionResponse.text();
        if (!captionXml || captionXml.length === 0) throw new Error('Empty caption response');
        
        const textMatches = captionXml.match(/<text[^>]*>(.*?)<\/text>/g);
        if (!textMatches) throw new Error('No text in captions');
        
        const text = textMatches
          .map((match: string) => match.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
          .join(' ')
          .trim();
        return text;
      },
    ];

    let fullText = '';

    for (const [index, method] of transcriptMethods.entries()) {
      try {
        console.log(`[YouTube API] Trying method ${index + 1}...`);
        fullText = await method();
        if (fullText && fullText.length > 50) {
          console.log(`[YouTube API] Success with method ${index + 1} (${fullText.length} chars)`);
          break;
        }
      } catch (error: any) {
        console.log(`[YouTube API] Method ${index + 1} failed:`, error.message);
        continue;
      }
    }

    if (!fullText || fullText.length < 50) {
      return NextResponse.json(
        { 
          error: 'No transcript available for this video',
          details: 'This video may not have captions enabled. Try a video with subtitles, or use the Audio Recording feature to transcribe it.',
          suggestion: 'Use Audio Recording to transcribe the video with Whisper AI'
        },
        { status: 404 }
      );
    }

    // Fetch video title
    let title = 'YouTube Video';
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const titleResponse = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        title = titleData.title || title;
      }
    } catch {
      // title stays default
    }

    return NextResponse.json({
      text: fullText,
      title: title,
      videoId: videoId,
      success: true
    });

  } catch (error: any) {
    console.error('[YouTube API] Unexpected error:', error?.message);
    return NextResponse.json(
      { 
        error: 'Failed to extract transcript. Try a different video or use Audio Recording.',
        suggestion: 'Use Audio Recording feature for video transcription'
      },
      { status: 500 }
    );
  }
}
