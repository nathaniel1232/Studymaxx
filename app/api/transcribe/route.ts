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
      if (credJson && credJson.startsWith('{')) {
        const creds = JSON.parse(credJson);
        vertexAI = new VertexAI({
          project: process.env.VERTEX_AI_PROJECT_ID,
          location: 'us-central1',
          googleAuthOptions: {
            credentials: creds,
          },
        });
      } else {
        vertexAI = new VertexAI({
          project: process.env.VERTEX_AI_PROJECT_ID,
          location: 'us-central1',
        });
      }
    } catch (e) {
      console.warn('[Transcribe] Vertex AI init failed:', e);
    }
  }
  
  if (!deepgram && process.env.DEEPGRAM_API_KEY) {
    try {
      deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    } catch (e) {
      console.warn('[Transcribe] Deepgram init failed:', e);
    }
  }
  
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (e) {
      console.warn('[Transcribe] OpenAI init failed:', e);
    }
  }
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

    // Try OpenAI Whisper first (primary)
    if (openai) {
      try {
        console.log('[Transcribe] Attempting transcription with OpenAI Whisper...');
        
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

      } catch (whisperError: any) {
        console.error('[Transcribe] Whisper failed, falling back to Deepgram:', whisperError.message);
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

    // Generate summary using Gemini 2.0 Flash with retry logic
    console.log('[Transcribe] Generating summary with Gemini...');
    
    if (!vertexAI) {
      return NextResponse.json(
        { error: 'Vertex AI not configured' },
        { status: 500 }
      );
    }
    
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    // Determine language instruction
    const languageInstruction = detectedLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== 'en'
      ? `IMPORTANT: The transcription is in ${detectedLanguage}. You MUST write the summary in ${detectedLanguage}. Do NOT translate to English.`
      : '';

    const summaryPrompt = `You are an expert at creating beautifully formatted study summaries from audio transcriptions.

${languageInstruction}

Analyze the following transcription and create a well-structured, visually appealing summary that captures all important information worth writing down for studying.

TRANSCRIPTION:
${transcription}

IMPORTANT: Output ONLY the formatted HTML content. Do NOT include any introductory text like "OK, here is..." or "Here's the summary...". Start directly with the first <h2> tag.

Create a comprehensive summary with BEAUTIFUL FORMATTING:

FORMATTING REQUIREMENTS:
- Use emojis to make sections visually distinct and engaging (📚 for main topics, 💡 for key concepts, ✨ for examples, 🎯 for conclusions, etc.)
- Use HTML tags for structure: <h2> for main sections, <h3> for subsections
- Use <b> for important terms and definitions
- Use <ul> and <li> for lists
- Use <p> for paragraphs with proper spacing
- Add subtle dividers with <hr style="border: 1px solid rgba(6, 182, 212, 0.2); margin: 1.5rem 0;">

STRUCTURE:
1. 📚 Main Topics - Section header with emoji + key topics covered
2. 💡 Key Concepts - Important definitions and core ideas
3. ✨ Examples & Details - Concrete examples and explanations  
4. 📝 Important Facts - Dates, names, formulas, processes
5. 🎯 Key Takeaways - Main conclusions and what to remember

EXAMPLE FORMAT:
<h2>📚 Main Topics</h2>
<p>This lecture covered <b>three main areas</b>: topic 1, topic 2, and topic 3.</p>

<hr style="border: 1px solid rgba(6, 182, 212, 0.2); margin: 1.5rem 0;">

<h2>💡 Key Concepts</h2>
<ul>
<li><b>Concept 1:</b> Definition here</li>
<li><b>Concept 2:</b> Definition here</li>
</ul>

${languageInstruction ? `Write EVERYTHING in ${detectedLanguage}. Preserve the original language.` : ''}
Make it study-friendly, visually organized, and easy to review later.`;

    // Retry logic with exponential backoff for rate limiting
    let summary = '';
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // Start with 2 seconds

    while (retryCount < maxRetries) {
      try {
        const summaryResult = await model.generateContent(summaryPrompt);
        summary = summaryResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        break; // Success, exit retry loop
      } catch (geminiError: any) {
        const isRateLimitError = geminiError.message?.includes('429') || 
                                  geminiError.message?.includes('RESOURCE_EXHAUSTED') ||
                                  geminiError.message?.includes('Too Many Requests') ||
                                  geminiError.code === 429;

        if (isRateLimitError && retryCount < maxRetries - 1) {
          retryCount++;
          const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff: 2s, 4s, 8s
          console.log(`[Transcribe] Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Either not a rate limit error, or we've exhausted retries
          throw geminiError;
        }
      }
    }

    console.log(`[Transcribe] Summary generated: ${summary.length} characters`);

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
                              error.code === 429;
    
    if (isRateLimitError) {
      return NextResponse.json(
        { error: 'AI service is temporarily overloaded. Please wait a few seconds and try again.' },
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
