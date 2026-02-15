import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

export const maxDuration = 60;

// Lazy-initialize Vertex AI
let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    if (!projectId) {
      throw new Error('VERTEX_AI_PROJECT_ID not configured');
    }
    
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credJson && credJson.startsWith('{')) {
      try {
        const creds = JSON.parse(credJson);
        vertexAI = new VertexAI({
          project: projectId,
          location: 'us-central1',
          googleAuthOptions: { credentials: creds },
        });
      } catch {
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
    const { text, length = 'medium', sourceType = 'text' } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length < 50) {
      return NextResponse.json({ error: 'Text too short to summarize (minimum 50 characters).' }, { status: 400 });
    }

    const lengthMap: Record<string, string> = {
      'short': 'MINIMUM 5-7 key points + 2-3 sections with bullets. Quick 1-2 minute read. Cover essential topics clearly.',
      'medium': 'MINIMUM 8-10 key points + 3-4 sections with detailed bullets. Easy 3-4 minute read. Cover all main topics thoroughly.',
      'long': 'MINIMUM 12-15 key points + 5-7 sections with comprehensive bullets. Thorough 5-7 minute read. Cover everything important with specific details and examples.',
    };
    const lengthInstruction = lengthMap[length] || lengthMap['medium'];

    const sourceLabel: Record<string, string> = {
      'text': 'notes',
      'pdf': 'document',
      'youtube': 'video',
      'website': 'article',
    };
    const srcLabel = sourceLabel[sourceType] || 'material';

    const prompt = `You are a study summary assistant. Create a clean, easy-to-read summary of this ${srcLabel}.

CRITICAL LANGUAGE RULE:
Write the summary in the SAME language as the input. If Norwegian, write in Norwegian. If English, write in English. Match the language EXACTLY.

LENGTH: ${lengthInstruction}

FORMAT — Follow this EXACT structure:

1. Start with an emoji + title line that describes the content (e.g. "📖 Photosynthesis Overview" or "🎬 Analysis of [Video Title]")

2. A "Brief Overview" section — 2-3 sentences max explaining what this is about

3. "Key Points" section — bullet points (use •) with the most important takeaways. Each point should be ONE short sentence, not a paragraph.

4. Break the content into logical sections (number depends on length setting), each with:
   - An emoji + section heading (e.g. "🧪 Chemical Reactions" or "📊 Key Statistics")
   - 3-6 bullet points per section with specific details
   - Keep each bullet SHORT but INFORMATIVE — one clear fact or concept per line

5. End with a "💡 Quick Summary" — 2-3 sentences that capture the essence

CRITICAL RULES:
• INCLUDE ALL IMPORTANT INFORMATION — names, dates, numbers, definitions, formulas, key concepts, examples
• Keep it SIMPLE and SCANNABLE — a student should be able to read this on the bus
• Use emojis for section headings (📌 🔑 📊 🧪 🎯 💡 📝 🌍 🎵 🎬 📖 🔬 ⚡ 🎓 etc.)
• Every point should be a bullet (•), not a paragraph
• NO walls of text — but don't skip important details
• NO markdown formatting (no **, ##, __)
• NO meta-text like "Here is a summary" — start directly with the emoji title
• Make it comprehensive enough to study from — don't leave out key information
• Balance brevity with completeness — short bullets, but ALL essential facts

INPUT:
${text}

SUMMARY:`;

    const model = getVertexAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: length === 'long' ? 6144 : length === 'medium' ? 3072 : 2048,
      },
    });

    const summary = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!summary) {
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error('[Summarize] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
