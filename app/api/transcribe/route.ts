import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { createClient } from '@deepgram/sdk';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let vertexAI: VertexAI | null = null;
let deepgram: any = null;
let openai: OpenAI | null = null;

function initializeClients() {
  if (!vertexAI && process.env.VERTEX_AI_PROJECT_ID) {
    try {
      const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (!credJson) {
        console.warn('[Transcribe] GOOGLE_APPLICATION_CREDENTIALS not set');
        // Try without credentials (uses default Application Default Credentials)
        vertexAI = new VertexAI({
          project: process.env.VERTEX_AI_PROJECT_ID,
          location: 'us-central1',
        });
      } else if (credJson.startsWith('{')) {
        try {
          const creds = JSON.parse(credJson);
          console.log('[Transcribe] Successfully parsed Google credentials');
          vertexAI = new VertexAI({
            project: process.env.VERTEX_AI_PROJECT_ID,
            location: 'us-central1',
            googleAuthOptions: {
              credentials: creds,
            },
          });
        } catch (parseError: any) {
          console.error('[Transcribe] Failed to parse GOOGLE_APPLICATION_CREDENTIALS:', parseError.message);
          console.error('[Transcribe] Trying without explicit credentials...');
          vertexAI = new VertexAI({
            project: process.env.VERTEX_AI_PROJECT_ID,
            location: 'us-central1',
          });
        }
      } else {
        // It's a file path, use it directly
        console.log('[Transcribe] Using GOOGLE_APPLICATION_CREDENTIALS as file path');
        vertexAI = new VertexAI({
          project: process.env.VERTEX_AI_PROJECT_ID,
          location: 'us-central1',
        });
      }
    } catch (e: any) {
      console.warn('[Transcribe] Vertex AI init failed:', e.message);
    }
  }
  
  if (!deepgram && process.env.DEEPGRAM_API_KEY) {
    try {
      deepgram = createClient(process.env.DEEPGRAM_API_KEY);
      console.log('[Transcribe] Deepgram initialized successfully');
    } catch (e: any) {
      console.warn('[Transcribe] Deepgram init failed:', e.message);
    }
  }
  
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('[Transcribe] OpenAI initialized successfully');
    } catch (e: any) {
      console.warn('[Transcribe] OpenAI init failed:', e.message);
    }
  }
  
  console.log('[Transcribe] Client initialization complete:', {
    hasVertexAI: !!vertexAI,
    hasDeepgram: !!deepgram,
    hasOpenAI: !!openai,
  });
}

export async function POST(request: NextRequest) {
  // Initialize clients on first request
  initializeClients();
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    console.log('[Transcribe] Processing audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Transcribe] Buffer size:', buffer.length, 'bytes');
    
    // Detect actual audio format from buffer signature
    const isWebM = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    const isMP3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33; // ID3
    const isWAV = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF
    
    console.log('[Transcribe] Audio format detection:', { isWebM, isMP3, isWAV });

    let transcription = '';
    let detectedLanguage = 'unknown';

    // Try OpenAI Whisper first (primary) with retry logic
    if (openai) {
      let whisperRetries = 0;
      const maxWhisperRetries = 3;
      const whisperBaseDelay = 1000; // Start with 1 second

      while (whisperRetries < maxWhisperRetries && !transcription) {
        try {
          console.log(`[Transcribe] Attempting transcription with OpenAI Whisper... (attempt ${whisperRetries + 1}/${maxWhisperRetries})`);
          
          // Convert buffer to File object for OpenAI
          const whisperFile = new File([buffer], 'audio.webm', { type: audioFile.type || 'audio/webm' });
          
          const whisperResponse = await openai.audio.transcriptions.create({
            file: whisperFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
            temperature: 0.0, // Most accurate transcription (not guessing words)
          });

          transcription = whisperResponse.text || '';
          detectedLanguage = whisperResponse.language || 'unknown';

          console.log(`[Transcribe] ✅ Whisper success: ${transcription.length} characters in ${detectedLanguage}`);
          break; // Success, exit retry loop

        } catch (whisperError: any) {
          const isRateLimitError = whisperError.status === 429 || 
                                    whisperError.code === 429 ||
                                    whisperError.message?.includes('429') ||
                                    whisperError.message?.includes('rate limit');

          if (isRateLimitError && whisperRetries < maxWhisperRetries - 1) {
            whisperRetries++;
            const delay = whisperBaseDelay * Math.pow(2, whisperRetries - 1); // Exponential backoff: 1s, 2s, 4s
            console.log(`[Transcribe] Whisper rate limit hit, retrying in ${delay}ms (attempt ${whisperRetries}/${maxWhisperRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error('[Transcribe] Whisper failed after retries, falling back to Deepgram:', whisperError.message);
            whisperRetries = maxWhisperRetries; // Exit loop
          }
        }
      }
    }
    
    // Fallback to Deepgram if Whisper failed or isn't available
    if (!transcription && deepgram) {
      try {
        console.log('[Transcribe] Attempting transcription with Deepgram Nova-2...');

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            buffer,
            {
              model: 'nova-2',
              smart_format: true,
              punctuate: true,
              paragraphs: true,
              detect_language: true,
              language: 'multi',
              diarize: false,
              utterances: true,
              filler_words: true,
              interim_results: false,
              endpointing: false,
            }
          );
          
          if (error) {
            throw new Error('Deepgram failed: ' + error.message);
          }

          transcription = result.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript
            || result.results?.channels?.[0]?.alternatives?.[0]?.transcript
            || '';
          
          detectedLanguage = result.results?.channels?.[0]?.detected_language || 'unknown';
          
          console.log(`[Transcribe] ✅ Deepgram success: ${transcription.length} characters`);

        } catch (deepgramError: any) {
          console.error('[Transcribe] Deepgram transcription failed:', deepgramError.message);
        }
    }

    if (!transcription || transcription.trim().length === 0) {
      console.error('[Transcribe] No transcription text after all attempts');
      return NextResponse.json(
        { error: 'Could not transcribe audio. Transcription services may not be configured.' },
        { status: 500 }
      );
    }

    console.log(`[Transcribe] Final transcription: ${transcription.length} characters transcribed`);

    // Generate summary using Gemini 2.0 Flash (non-fatal — transcription always returned)
    let summary = '';
    
    try {
    if (!vertexAI) {
      console.warn('[Transcribe] Vertex AI not configured, skipping summary generation');
      throw new Error('Vertex AI not configured');
    }
    
    console.log('[Transcribe] Generating summary with Gemini...');
    
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    // Determine language instruction
    let languageCode = detectedLanguage || 'unknown';
    let languageName = detectedLanguage || 'unknown';
    
    // Map common language codes to full names
    const languageMap: Record<string, string> = {
      'no': 'Norwegian',
      'nb': 'Norwegian Bokmål', 
      'nn': 'Norwegian Nynorsk',
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'sv': 'Swedish',
      'da': 'Danish',
      'fi': 'Finnish',
    };
    
    if (languageCode in languageMap) {
      languageName = languageMap[languageCode];
    }

    const summaryPrompt = `You are an expert at creating beautifully formatted study summaries from audio transcriptions.

${languageCode !== 'unknown' && languageCode !== 'en' ? `
🌍 CRITICAL LANGUAGE REQUIREMENT 🌍
The transcription is in ${languageName} (${languageCode}).
YOU MUST WRITE THE ENTIRE SUMMARY IN ${languageName.toUpperCase()}.
DO NOT translate to English. DO NOT mix languages.
All text, headers, descriptions, and content MUST be in ${languageName}.
` : ''}

Analyze the following transcription and create a well-structured, visually appealing summary that captures all important information worth studying.

TRANSCRIPTION:
${transcription}

CRITICAL OUTPUT FORMAT:
- Start IMMEDIATELY with the first <h2> tag  
- DO NOT write "html" or code fence markers (three backticks with html)
- DO NOT write introductory text like "Here is..." or "OK, here's..."
- Your first characters must be: <h2>📚

${languageCode !== 'unknown' && languageCode !== 'en' ? `LANGUAGE: Write EVERYTHING in ${languageName}. Use ${languageName} for ALL headings, descriptions, and content.` : ''}

Create a comprehensive summary with BEAUTIFUL FORMATTING:

FORMATTING REQUIREMENTS:
- Use emojis to make sections visually distinct (📚 for main topics, 💡 for key concepts, ✨ for examples, 🎯 for conclusions)
- Use HTML tags: <h2> for main sections, <h3> for subsections
- Use <b> for important terms and definitions
- Use <ul> and <li> for lists
- Use <p> for paragraphs with proper spacing
- Add dividers: <hr style="border: 1px solid rgba(6, 182, 212, 0.2); margin: 1.5rem 0;">

STRUCTURE:
1. 📚 Main Topics - Section header with emoji + key topics covered
2. 💡 Key Concepts - Important definitions and core ideas
3. ✨ Examples & Details - Concrete examples and explanations  
4. 📝 Important Facts - Dates, names, formulas, processes
5. 🎯 Key Takeaways - Main conclusions

EXAMPLE START (use this format):
<h2>📚 Main Topics</h2>
<p>This section covered...</p>

${languageCode !== 'unknown' && languageCode !== 'en' ? `\nREMEMBER: ALL text in ${languageName}, NO English.` : ''}`;

    // Retry logic with exponential backoff for rate limiting
    let retryCount = 0;
    const maxRetries = 5; // Increased from 3 to 5
    const baseDelay = 1000; // Start with 1 second (reduced from 2)

    while (retryCount < maxRetries) {
      try {
        const summaryResult = await model.generateContent(summaryPrompt);
        summary = summaryResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[Transcribe] ✅ Gemini summary generated successfully on attempt ${retryCount + 1}`);
        break; // Success, exit retry loop
      } catch (geminiError: any) {
        const isRateLimitError = geminiError.message?.includes('429') || 
                                  geminiError.message?.includes('RESOURCE_EXHAUSTED') ||
                                  geminiError.message?.includes('Too Many Requests') ||
                                  geminiError.message?.includes('quota') ||
                                  geminiError.code === 429;

        if (isRateLimitError && retryCount < maxRetries - 1) {
          retryCount++;
          const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          console.log(`[Transcribe] Gemini rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Either not a rate limit error, or we've exhausted retries
          console.error(`[Transcribe] Gemini failed after ${retryCount + 1} attempts:`, geminiError.message);
          break; // Don't throw — we'll return transcription without summary
        }
      }
    }

    console.log(`[Transcribe] Summary generated: ${summary.length} characters`);
    
    // Clean up summary output - remove code block markers and unwanted prefixes
    const backticks = '```';
    summary = summary
      .replace(new RegExp(`^${backticks}html\\s*`, 'i'), '')  // Remove opening ```html
      .replace(new RegExp(`\\s*${backticks}\\s*$`, 'i'), '')  // Remove closing ```
      .replace(/^html\s*/i, '')      // Remove "html" prefix
      .replace(/^Here(?:'s| is) (?:the |your )?summary[:\s]*/i, '') // Remove "Here's the summary:" etc
      .replace(/^OK,?\s*/i, '')      // Remove "OK," prefix
      .trim();

    } catch (summaryErr: any) {
      console.error('[Transcribe] Summary generation failed (non-fatal):', summaryErr.message);
      summary = '';
    }

    // Fallback summary if generation failed or was skipped
    if (!summary) {
      const safePreview = transcription.substring(0, 400).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      summary = '<h2>\ud83d\udcdd Audio Transcription</h2><p>' + safePreview + (transcription.length > 400 ? '...' : '') + '</p><hr style="border: 1px solid rgba(6, 182, 212, 0.2); margin: 1.5rem 0;"><p><em>Automatic summary is temporarily unavailable. Your full transcription is saved above.</em></p>';
    }

    console.log('[Transcribe] Transcription complete, length:', transcription.length);

    return NextResponse.json({
      text: transcription,
      summary: summary,
      language: detectedLanguage,
      success: true
    });

  } catch (error: any) {
    console.error('[Transcribe] Critical error:', error);
    console.error('[Transcribe] Error stack:', error.stack);
    console.error('[Transcribe] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      type: error?.error?.type
    });
    
    // Handle specific error types
    if (error?.error?.type === 'invalid_request_error') {
      return NextResponse.json(
        { error: 'Invalid audio format. Please try recording again or use a different file.' },
        { status: 400 }
      );
    }

    // Handle rate limiting errors
    const isRateLimitError = error.message?.includes('429') || 
                              error.message?.includes('RESOURCE_EXHAUSTED') ||
                              error.message?.includes('Too Many Requests') ||
                              error.message?.includes('rate limit') ||
                              error.code === 429;
    
    if (isRateLimitError) {
      // Determine which service hit the rate limit
      let serviceName = 'AI service';
      if (error.message?.includes('Whisper') || error.message?.includes('OpenAI')) {
        serviceName = 'OpenAI Whisper';
      } else if (error.message?.includes('Gemini') || error.message?.includes('Vertex')) {
        serviceName = 'Vertex AI Gemini';
      } else if (error.message?.includes('Deepgram')) {
        serviceName = 'Deepgram';
      }

      console.error(`[Transcribe] Rate limit error from ${serviceName}:`, error.message);
      
      return NextResponse.json(
        { error: `${serviceName} is temporarily rate limited. Please wait 30-60 seconds and try again. If this persists, check your API quotas.` },
        { status: 429 }
      );
    }

    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Transcription service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('no speech')) {
      return NextResponse.json(
        { error: 'No speech detected in audio. Make sure you are speaking clearly and the microphone is working.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio. Please check your audio quality and try again.' },
      { status: 500 }
    );
  }
}
