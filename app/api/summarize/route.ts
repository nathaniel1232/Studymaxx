import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { checkServerRateLimit, getClientIP } from '../../utils/serverRateLimit';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 120;

// Lazy-initialize Vertex AI at runtime (not build time)
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

async function isUserPremium(userId: string | null | undefined): Promise<boolean> {
  if (!userId || userId.startsWith('anon')) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const supabase = createClient(url, key);
    const { data } = await supabase.from('users').select('is_premium').eq('id', userId).single();
    return data?.is_premium === true;
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  try {
    const { text, length = 'medium', sourceType = 'text', outputLanguage, userId } = await request.json();

    // Premium users bypass rate limit; free users capped at 3/IP/day
    const premium = await isUserPremium(userId);
    if (!premium) {
      const clientIP = getClientIP(request);
      const rateCheck = checkServerRateLimit(`summarize:${clientIP}`, 3);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: 'Daily summary limit reached. Upgrade to Premium for unlimited summaries.' },
          { status: 429 }
        );
      }
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length < 50) {
      return NextResponse.json({ error: 'Text too short to summarize (minimum 50 characters).' }, { status: 400 });
    }

    // Resolve explicit language name from code
    const LANG_NAMES: Record<string, string> = {
      en: 'English', no: 'Norwegian', es: 'Spanish', fr: 'French',
      de: 'German', sv: 'Swedish', da: 'Danish', fi: 'Finnish',
      pt: 'Portuguese', it: 'Italian', nl: 'Dutch', pl: 'Polish',
      tr: 'Turkish', ru: 'Russian', uk: 'Ukrainian', ar: 'Arabic',
      zh: 'Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi',
      cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', el: 'Greek',
      bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian',
      et: 'Estonian', lv: 'Latvian', lt: 'Lithuanian', sr: 'Serbian',
      bs: 'Bosnian', is: 'Icelandic', ga: 'Irish', cy: 'Welsh',
      ca: 'Catalan', eu: 'Basque', gl: 'Galician',
      th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
      tl: 'Filipino', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
      ur: 'Urdu', fa: 'Persian', he: 'Hebrew',
      sw: 'Swahili', am: 'Amharic',
    };
    const explicitLang = outputLanguage ? LANG_NAMES[outputLanguage] : null;
    console.log('[Summarize API] Output language:', outputLanguage, '→', explicitLang || 'auto-detect');

    const lengthMap: Record<string, string> = {
      'short': 'MINIMUM 100-150 words across 3-5 sections. Each section must have 2-4 bullets. This is a QUICK overview, but still comprehensive and informative.',
      'medium': 'MINIMUM 250-350 words across 5-7 sections. Each section must have 3-5 bullets. This is a STANDARD summary - thorough but not exhaustive.',
      'long': 'MINIMUM 500-700 words across 8-12 sections. Each section must have 4-7 bullets. This is a COMPREHENSIVE summary covering all important details with examples and context.',
    };
    const lengthInstruction = lengthMap[length] || lengthMap['medium'];

    const sourceLabel: Record<string, string> = {
      'text': 'notes',
      'pdf': 'document',
      'youtube': 'video',
      'website': 'article',
    };
    const srcLabel = sourceLabel[sourceType] || 'material';

    const prompt = `🚨 ABSOLUTE REQUIREMENT - OUTPUT LANGUAGE 🚨
${explicitLang && explicitLang !== 'English'
  ? `YOU MUST write this ENTIRE summary in ${explicitLang}. Every word, every heading, every bullet point MUST be in ${explicitLang}.
DO NOT write in English. DO NOT mix languages. The user specifically chose ${explicitLang} as their language.
This is NON-NEGOTIABLE.`
  : explicitLang === 'English'
  ? `Write this summary in English.`
  : `Write this summary in the SAME LANGUAGE as the input text below.
- If input is Norwegian → summary in Norwegian
- If input is Spanish → summary in Spanish
- If input is French → summary in French
- If input is German → summary in German
- If input is English → summary in English
DO NOT translate to English. DO NOT use English if the input is another language.
Match the input language character-by-character. This is MANDATORY.`
}

===================================================

You are an expert academic summarizer. Create a comprehensive, well-structured summary of this ${srcLabel}.

LENGTH REQUIREMENT: ${lengthInstruction}

CRITICAL: DO NOT create a short or vague summary! The user needs a COMPREHENSIVE summary with ALL important information. Include:
- ALL key concepts, definitions, and terms
- ALL important names, dates, numbers, and statistics  
- ALL main arguments, theories, or explanations
- Specific examples and details (not just generic statements)
- Context and background information
- Relationships between concepts

FORMAT — Follow this EXACT structure:

1. Title Line: Start with a relevant emoji + title (e.g. "📖 Complete Overview: Photosynthesis" or "🌍 Deep Dive: World Geography")

2. "📋 Overview" section (2-3 sentences explaining what this content covers)

3. Content Sections — Break into logical topic sections. Each section MUST have:
   - Emoji + clear heading (e.g. "🧪 Chemical Process", "📊 Statistical Analysis", "🎯 Key Concepts")
   - Multiple bullet points (•) with DETAILED information
   - Each bullet should be 1-2 sentences with specific facts
   - DO NOT skip important details to save space
   - Include numbers, percentages, dates, names, technical terms
   - Add sub-bullets (◦) for related details when needed

4. "💡 Key Takeaways" — Final section with 3-5 sentences summarizing the most important points

CRITICAL RULES FOR QUALITY:
✅ COMPREHENSIVE: Cover ALL main topics - don't leave out important sections
✅ SPECIFIC: Use exact terms, names, numbers (not "many studies" but "23 studies from 2020-2023")  
✅ DETAILED: Each bullet should contain substantial information, not vague statements
✅ WELL-ORGANIZED: Logical flow between sections
✅ STUDENT-FRIENDLY: Clear language but don't dumb it down - include proper terminology
✅ SCANNABLE: Use emojis, bullets, clear spacing
✅ COMPLETE: If the source has 10 main topics, your summary should cover all 10

FORMAT RULES:
• Use emojis for all section headings (📌 🔑 📊 🧪 🎯 💡 📝 🌍 🎵 📖 🔬 ⚡ 🎓 🌡️ 💰 ⚙️ 🏛️ 🧬)
• Every point uses a bullet (•)
• Sub-points use circle bullets (◦)
• NO markdown formatting (no **, ##, __)
• NO meta-text like "Here is a summary" — start directly with the title
• NO walls of text — use bullets and spacing

EXAMPLES OF GOOD vs BAD BULLETS:
❌ BAD: "Birds are diverse and found worldwide"
✅ GOOD: "Over 11,000 bird species exist worldwide, ranging from the 5.5cm bee hummingbird to the 2.8m ostrich • Found on every continent including Antarctica (penguins)"

❌ BAD: "The process involves several steps"
✅ GOOD: "Photosynthesis occurs in 3 stages: Light absorption (chlorophyll captures photons), Light reactions (produces ATP + NADPH), Calvin Cycle (converts CO₂ to glucose) • Takes place in chloroplasts"

Remember: This is for STUDY purposes. Students need detailed, complete information to learn from. Don't create a "too long; didn't read" - create a "organized and complete" summary.

🚨 REMINDER: ${explicitLang && explicitLang !== 'English' ? `Write your ENTIRE summary in ${explicitLang}. NOT in English.` : explicitLang === 'English' ? 'Write in English.' : 'Write your summary in the SAME language as the input below. NOT in English unless input is English.'} 🚨

INPUT:
${text}

SUMMARY${explicitLang ? ` (in ${explicitLang})` : ' (in the same language as the input above)'}:`;

    // Use Gemini 2.5 Flash for summarization
    const systemInstruction = `You are an expert academic summarizer. ${explicitLang && explicitLang !== 'English' ? `CRITICAL: You MUST write ALL summaries in ${explicitLang}. The user has chosen ${explicitLang} as their language. NEVER write in English. Every heading, bullet point, and sentence must be in ${explicitLang}.` : explicitLang === 'English' ? 'Write summaries in English.' : 'CRITICAL: You MUST write summaries in the SAME language as the input text. If input is Norwegian, write in Norwegian. If Spanish, write in Spanish. If German, write in German. NEVER translate to English unless the input is English. This is an absolute requirement.'}`;

    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const completion = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: systemInstruction + '\n\n' + prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: length === 'long' ? 8192 : length === 'medium' ? 5120 : 3072,
      },
    });

    const response = completion.response;
    const summary = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

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
