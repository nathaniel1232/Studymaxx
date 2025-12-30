/**
 * Client-side YouTube transcript fetcher
 * Runs in the browser to bypass YouTube's server-side bot detection
 */

export async function fetchYouTubeTranscript(videoUrl: string): Promise<string> {
  // Extract video ID
  const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  
  if (!videoIdMatch || !videoIdMatch[1]) {
    throw new Error("Invalid YouTube URL");
  }

  const videoId = videoIdMatch[1];
  
  // Fetch the video page from the browser (YouTube allows this)
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error("Could not fetch video page");
  }

  const html = await response.text();

  // Extract caption tracks from the page
  const captionsMatch = html.match(/"captionTracks":(\[.*?\])/);
  
  if (!captionsMatch) {
    throw new Error("This video has no captions available");
  }

  let captionTracks;
  try {
    captionTracks = JSON.parse(captionsMatch[1]);
  } catch (e) {
    throw new Error("Could not parse caption data");
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("This video has no captions available");
  }

  // Find English track or use first available
  const englishTrack = captionTracks.find((track: any) => 
    track.languageCode === 'en' || track.languageCode?.startsWith('en')
  );
  const captionTrack = englishTrack || captionTracks[0];

  // Fetch the caption XML
  const captionResponse = await fetch(captionTrack.baseUrl);
  
  if (!captionResponse.ok) {
    throw new Error("Could not fetch caption data");
  }

  const captionXml = await captionResponse.text();

  // Parse XML to extract text
  const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
  const textSegments = [];

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
      textSegments.push(text);
    }
  }

  if (textSegments.length === 0) {
    throw new Error("Could not extract text from captions");
  }

  return textSegments.join(' ');
}
