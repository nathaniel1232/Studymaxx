import { NextResponse } from 'next/server';

export const maxDuration = 60;

// Decode HTML entities in transcript text
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\[.*?\]/g, '') // Remove [♪♪♪] music markers
    .trim();
}

// Parse XML caption response into plain text
function parseXmlCaptions(xml: string): string {
  // Try <text> tags first, then <p> tags
  let matches = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g);
  if (!matches || matches.length === 0) {
    matches = xml.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
  }
  if (!matches || matches.length === 0) return '';

  return matches
    .map(match => {
      const inner = match.replace(/<[^>]+>/g, '');
      return decodeHtmlEntities(inner);
    })
    .filter(t => t.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse JSON3 caption format into plain text
function parseJson3Captions(json: any): string {
  try {
    const events = json.events || [];
    const texts: string[] = [];
    for (const event of events) {
      if (event.segs) {
        const segText = event.segs
          .map((seg: any) => seg.utf8 || '')
          .join('')
          .trim();
        if (segText && segText !== '\n') {
          texts.push(segText);
        }
      }
    }
    return texts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

// Pick best caption track (prefer manual English, then auto English, then any)
function pickBestTrack(tracks: any[]): any {
  // 1. Manual English
  const manualEn = tracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr');
  if (manualEn) return manualEn;
  // 2. Auto-generated English
  const autoEn = tracks.find((t: any) => t.languageCode === 'en');
  if (autoEn) return autoEn;
  // 3. Any manual track
  const anyManual = tracks.find((t: any) => t.kind !== 'asr');
  if (anyManual) return anyManual;
  // 4. First available
  return tracks[0];
}

// Fetch caption text from a baseUrl
async function fetchCaptionsFromUrl(baseUrl: string): Promise<string> {
  // Try JSON3 format first (more reliable for auto-generated)
  const json3Url = baseUrl.includes('&fmt=') 
    ? baseUrl.replace(/&fmt=[^&]+/, '&fmt=json3') 
    : baseUrl + '&fmt=json3';

  try {
    const jsonRes = await fetch(json3Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (jsonRes.ok) {
      const contentType = jsonRes.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const jsonData = await jsonRes.json();
        const text = parseJson3Captions(jsonData);
        if (text.length > 50) return text;
      }
    }
  } catch {
    // Fall through to XML
  }

  // Fallback: XML format
  const xmlUrl = baseUrl.includes('&fmt=') 
    ? baseUrl.replace(/&fmt=[^&]+/, '') 
    : baseUrl;

  const xmlRes = await fetch(xmlUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!xmlRes.ok) throw new Error(`Caption fetch returned ${xmlRes.status}`);
  const xmlText = await xmlRes.text();
  return parseXmlCaptions(xmlText);
}

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
        // Handle /shorts/ URLs
        if (!videoId && urlObj.pathname.startsWith('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1]?.split('/')[0] || '';
        }
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1).split('?')[0];
      }
    } catch {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    if (!videoId || videoId.length !== 11) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    console.log('[YouTube API] Fetching transcript for video:', videoId);

    const transcriptMethods = [
      // Method 1: Scrape watch page HTML for ytInitialPlayerResponse
      // This is the most reliable method as it gets the data YouTube embeds in the page
      async () => {
        console.log('[YouTube API] Trying HTML page scrape (ytInitialPlayerResponse)...');
        const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'CONSENT=PENDING+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJlbiACGgYIgJnSmgY',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!watchRes.ok) throw new Error(`Watch page returned ${watchRes.status}`);
        const html = await watchRes.text();

        // Try to extract captions from ytInitialPlayerResponse
        let captionTracks: any[] | null = null;

        // Approach A: Look for "captionTracks" directly in the HTML  
        const captionTracksMatch = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
        if (captionTracksMatch) {
          try {
            captionTracks = JSON.parse(captionTracksMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"'));
          } catch { /* try next approach */ }
        }

        // Approach B: Parse ytInitialPlayerResponse
        if (!captionTracks) {
          const playerResponseMatch = html.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/);
          if (playerResponseMatch) {
            try {
              const playerData = JSON.parse(playerResponseMatch[1]);
              captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            } catch { /* try next approach */ }
          }
        }

        // Approach C: Look in the serialized player response in ytcfg
        if (!captionTracks) {
          const captionJsonMatch = html.match(/"captions"\s*:\s*\{[^}]*"playerCaptionsTracklistRenderer"\s*:\s*\{[^}]*"captionTracks"\s*:\s*(\[[\s\S]*?\])/);
          if (captionJsonMatch) {
            try {
              // Need to be careful with the JSON boundary
              let jsonStr = captionJsonMatch[1];
              // Find the closing bracket
              let depth = 0;
              let endIdx = 0;
              for (let i = 0; i < jsonStr.length; i++) {
                if (jsonStr[i] === '[') depth++;
                if (jsonStr[i] === ']') depth--;
                if (depth === 0) { endIdx = i + 1; break; }
              }
              jsonStr = jsonStr.substring(0, endIdx);
              captionTracks = JSON.parse(jsonStr.replace(/\\u0026/g, '&').replace(/\\"/g, '"'));
            } catch { /* try next approach */ }
          }
        }

        if (!captionTracks || captionTracks.length === 0) {
          throw new Error('No caption tracks found in page HTML');
        }

        console.log(`[YouTube API] Found ${captionTracks.length} caption tracks:`, 
          captionTracks.map((t: any) => `${t.languageCode}${t.kind === 'asr' ? ' (auto)' : ''}`).join(', '));

        const track = pickBestTrack(captionTracks);
        let captionUrl = track.baseUrl;
        if (!captionUrl) throw new Error('No caption URL in track');
        captionUrl = captionUrl.replace(/\\u0026/g, '&');

        const text = await fetchCaptionsFromUrl(captionUrl);
        if (!text || text.length < 50) throw new Error(`Caption text too short (${text.length} chars)`);
        return text;
      },

      // Method 2: InnerTube WEB API (like youtube-transcript-api Python library)
      async () => {
        console.log('[YouTube API] Trying InnerTube WEB API...');
        
        // First fetch the page to get the API key
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Cookie': 'CONSENT=PENDING+999',
          },
          signal: AbortSignal.timeout(10000),
        });
        const pageHtml = await pageRes.text();
        
        // Extract INNERTUBE_API_KEY
        const apiKeyMatch = pageHtml.match(/"INNERTUBE_API_KEY"\s*:\s*"([a-zA-Z0-9_-]+)"/);
        const apiKey = apiKeyMatch?.[1] || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'; // fallback key

        const playerRes = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Origin': 'https://www.youtube.com',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`,
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20241126.01.00',
                hl: 'en',
                gl: 'US',
              }
            },
            videoId: videoId,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!playerRes.ok) throw new Error(`InnerTube WEB API returned ${playerRes.status}`);
        
        const playerData = await playerRes.json();
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!captions || captions.length === 0) throw new Error('No caption tracks from InnerTube WEB API');

        console.log(`[YouTube API] InnerTube found ${captions.length} tracks:`,
          captions.map((t: any) => `${t.languageCode}${t.kind === 'asr' ? ' (auto)' : ''}`).join(', '));

        const track = pickBestTrack(captions);
        const captionUrl = track.baseUrl;
        if (!captionUrl) throw new Error('No caption URL');

        const text = await fetchCaptionsFromUrl(captionUrl);
        if (!text || text.length < 50) throw new Error(`Caption text too short (${text.length} chars)`);
        return text;
      },

      // Method 3: youtube-transcript npm package
      async () => {
        console.log('[YouTube API] Trying youtube-transcript npm package...');
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        if (!transcriptItems || transcriptItems.length === 0) throw new Error('No transcript from npm package');
        const text = transcriptItems
          .map((item: any) => decodeHtmlEntities(item.text))
          .filter((t: string) => t.length > 0)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length < 50) throw new Error(`NPM transcript too short (${text.length} chars)`);
        return text;
      },

      // Method 4: InnerTube ANDROID API (legacy fallback)
      async () => {
        console.log('[YouTube API] Trying InnerTube ANDROID API (legacy)...');
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
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!playerRes.ok) throw new Error(`ANDROID API returned ${playerRes.status}`);
        
        const playerData = await playerRes.json();
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!captions || captions.length === 0) throw new Error('No caption tracks from ANDROID API');

        const track = pickBestTrack(captions);
        const captionUrl = track.baseUrl;
        if (!captionUrl) throw new Error('No caption URL');

        const text = await fetchCaptionsFromUrl(captionUrl);
        if (!text || text.length < 50) throw new Error(`Caption text too short (${text.length} chars)`);
        return text;
      },
    ];

    let fullText = '';

    for (const [index, method] of transcriptMethods.entries()) {
      try {
        console.log(`[YouTube API] Trying method ${index + 1}/4...`);
        fullText = await method();
        if (fullText && fullText.length > 50) {
          console.log(`[YouTube API] ✅ Success with method ${index + 1} (${fullText.length} chars)`);
          break;
        }
      } catch (error: any) {
        console.log(`[YouTube API] ❌ Method ${index + 1} failed:`, error.message);
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
