import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

// Lazy-initialize Vertex AI at runtime (not build time)
let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    if (!projectId) {
      throw new Error('VERTEX_AI_PROJECT_ID not configured');
    }
    
    // Check for GOOGLE_APPLICATION_CREDENTIALS JSON in env var
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credJson && credJson.startsWith('{')) {
      try {
        const creds = JSON.parse(credJson);
        vertexAI = new VertexAI({
          project: projectId,
          location: 'us-central1',
          googleAuthOptions: {
            credentials: creds,
          },
        });
      } catch (e) {
        console.error('[Chat] Failed to parse GOOGLE_APPLICATION_CREDENTIALS JSON:', e);
        vertexAI = new VertexAI({
          project: projectId,
          location: 'us-central1',
        });
      }
    } else {
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
      });
    }
  }
  return vertexAI;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId, context, history, outputLanguage } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Resolve language name from code
    const LANG_NAMES: Record<string, string> = {
      en: 'English', no: 'Norwegian', es: 'Spanish', fr: 'French',
      de: 'German', sv: 'Swedish', da: 'Danish', fi: 'Finnish',
      pt: 'Portuguese', it: 'Italian', nl: 'Dutch', pl: 'Polish',
      tr: 'Turkish', ru: 'Russian', uk: 'Ukrainian', ar: 'Arabic',
      zh: 'Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi',
    };
    const langName = outputLanguage ? LANG_NAMES[outputLanguage] : null;

    // Detect if user is asking for a summary/analysis
    const isSummaryRequest = /\b(summar|analyz|overview|break.?down|oppsummer|analyser|sammendrag)\b/i.test(message);
    
    // Detect if user is EXPLICITLY asking for HTML/website/code creation (BLOCK THIS)
    const isCodeRequest = /\b(create|make|build|write|generate)\s+(a|an|me)?\s*(html|website|webpage|web page|web site|code|program|script|function)\b/i.test(message) || 
                          /<html|<!DOCTYPE|<script|<style/.test(message);
    
    // If user asks for code creation, return polite rejection immediately
    if (isCodeRequest) {
      return NextResponse.json({
        response: "I cannot create HTML code, websites, or programming code. I'm here to help you solve academic exercises and understand study material in subjects like math, physics, chemistry, biology, history, and more. Ask me about a problem or concept you're studying! 📚"
      });
    }

    const contextLimit = isSummaryRequest ? 6000 : 3000;
    
    // Build language instruction
    const langInstruction = langName && langName !== 'English'
      ? `\n\n🚨 LANGUAGE REQUIREMENT: You MUST respond ENTIRELY in ${langName}. The user has chosen ${langName} as their language. ALL your responses — explanations, examples, summaries — must be in ${langName}. Do NOT respond in English unless the user explicitly writes in English.`
      : '';

    const systemPrompt = `You are StudyMaxx AI — an expert study tutor built into the StudyMaxx learning platform.

YOUR ROLE:
- Help students understand their study materials deeply
- Give clear, accurate explanations for any concept or term
- If the student says they don't understand something, break it down simply
- Adjust your language to match the student's (if they write in Norwegian, respond in Norwegian, etc.)${langInstruction}

🚨 CRITICAL RESTRICTION - NO CODE GENERATION:
- You MUST NOT generate HTML, CSS, JavaScript, or any programming code
- You MUST NOT create websites, web pages, or any code snippets
- If asked for code, respond: "I cannot create code. I'm here to help with academic subjects like math, physics, chemistry, biology, history, etc."
- You are ONLY for academic study help: solving problems, explaining concepts, analyzing study material

HOW TO RESPOND:
- Be concise but complete — typically 2-6 sentences unless a longer explanation is needed
- Use simple language and break down complex ideas
- Give specific examples when helpful
- If the student asks about something from their material, reference it directly
- Answer the actual question — don't pad with unnecessary motivation

SPECIAL: SUMMARIZE / ANALYZE REQUESTS
If the student asks you to "summarize", "analyze", "give an overview", or "break down" their notes/material, provide a COMPREHENSIVE structured analysis using this EXACT format:

TITLE & CONTEXT
• Descriptive title for the material
• Type of content, subject area, and why it matters

KEY POINTS
• List 3-7 of the most important insights as bullet points
• Each point should be specific and standalone

SECTION-BY-SECTION BREAKDOWN
• Go through the material systematically in logical sections
• For each section: heading, main content summary, specific details (names, dates, formulas, definitions)
• Show connections between sections

THEMATIC & CONCEPTUAL INSIGHTS
• Overarching themes and patterns
• Tone, approach, and methodology
• Connections between concepts
• Any gaps or limitations

QUICK SUMMARY
• One paragraph (3-5 sentences) capturing the essence of the entire material

FORMATTING:
- Do NOT use markdown (no **, __, #, or *)
- Use plain text with natural paragraph breaks
- Use bullet points and numbered lists for clarity
- Section headers should be in CAPS

${context ? `\nSTUDY MATERIAL:\n${context.substring(0, contextLimit)}` : ''}`;

    // Build conversation contents for Gemini
    // Start with system instruction as the first user message, then alternate user/model
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    // Add system prompt as first turn
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood! I\'m ready to help you study. Ask me anything about your material.' }] });

    // Add conversation history (last 10 messages max to keep tokens low)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: msg.text }] });
        } else if (msg.role === 'ai') {
          contents.push({ role: 'model', parts: [{ text: msg.text }] });
        }
      }
    }

    // Add current message
    contents.push({ role: 'user', parts: [{ text: message }] });

    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const streamingResult = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: isSummaryRequest ? 4096 : 1200,
      },
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamingResult.stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              const cleanText = text.replace(/\*\*/g, '').replace(/__/g, '').replace(/#{1,6}\s/g, '');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('[Chat API] Error:', err?.message);
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: err.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
