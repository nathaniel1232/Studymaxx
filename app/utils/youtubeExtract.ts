// Add this file for YouTube transcript extraction on the client side
// But actually we'll use the API route instead for better reliability

export async function extractYouTubeTranscript(videoUrl: string): Promise<string> {
  const response = await fetch('/api/youtube/transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ videoUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to extract transcript');
  }

  const data = await response.json();
  return data.transcript;
}
