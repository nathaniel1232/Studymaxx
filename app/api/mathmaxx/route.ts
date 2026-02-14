/**
 * /api/mathmaxx — Main chat endpoint for MathMaxx AI math tutor
 * 
 * Flow:
 * 1. Receive user message + chat history
 * 2. Run message through math.js to detect/compute expressions
 * 3. Build enhanced prompt with computed results (when available)
 * 4. Send to Gemini 2.5 Flash with pedagogical system prompt
 * 5. Stream response back via SSE
 * 
 * The math engine pre-computes answers so Gemini can focus on
 * explaining the steps — this ensures correct answers even when
 * the LLM might otherwise make arithmetic mistakes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { buildMathContext } from './mathEngine';
import { getSystemPrompt } from './systemPrompt';

// --- Vertex AI initialization (lazy, singleton) ---
let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    if (!projectId) throw new Error('VERTEX_AI_PROJECT_ID not configured');

    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credJson && credJson.startsWith('{')) {
      try {
        const creds = JSON.parse(credJson);
        vertexAI = new VertexAI({
          project: projectId,
          location: 'us-central1',
          googleAuthOptions: { credentials: creds },
        });
      } catch (e) {
        console.error('[MathMaxx] Failed to parse credentials:', e);
        vertexAI = new VertexAI({ project: projectId, location: 'us-central1' });
      }
    } else {
      vertexAI = new VertexAI({ project: projectId, location: 'us-central1' });
    }
  }
  return vertexAI;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, userId, language, schoolLevel } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // --- Step 1: Run through math engine ---
    // Detects expressions and pre-computes results with math.js
    const { enhancedMessage, computedResult, detectedExpression } = buildMathContext(message);

    if (computedResult) {
      console.log(`[MathMaxx] Computed: "${detectedExpression}" = ${computedResult}`);
    }

    // --- Step 2: Build conversation for Gemini ---
    const systemPrompt = getSystemPrompt(language, schoolLevel);
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // System prompt injected as first user/model exchange
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Ready to help with math! What would you like to work on?' }] });

    // Add conversation history (last 20 messages for context window)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: msg.text }] });
        } else if (msg.role === 'ai') {
          contents.push({ role: 'model', parts: [{ text: msg.text }] });
        }
      }
    }

    // Add current message (enhanced with math.js result if available)
    contents.push({ role: 'user', parts: [{ text: enhancedMessage }] });

    // --- Step 3: Call Gemini with streaming ---
    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const streamingResult = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: 0.1,   // Very low for math accuracy and consistent simple explanations
        maxOutputTokens: 3072, // Enough for detailed step-by-step
      },
    });

    // --- Step 4: Stream response via SSE ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamingResult.stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[MathMaxx] Stream error:', error);
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
    console.error('[MathMaxx] Error:', err?.message);
    return NextResponse.json(
      { error: 'Failed to process message', details: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
