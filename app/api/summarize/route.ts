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

    // Detect input language from the first 500 chars for auto-detect mode
    let targetLang = explicitLang || null;
    if (!targetLang) {
      // Quick heuristic: detect language from sample text
      const sample = text.substring(0, 500);
      // Script-based detection
      if ((sample.match(/[\u0400-\u04FF]/g)?.length ?? 0) > 10) targetLang = 'Russian';
      else if ((sample.match(/[\u0370-\u03FF]/g)?.length ?? 0) > 5) targetLang = 'Greek';
      else if ((sample.match(/[\u0600-\u06FF]/g)?.length ?? 0) > 5) targetLang = 'Arabic';
      else if ((sample.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length ?? 0) > 3) targetLang = 'Japanese';
      else if ((sample.match(/[\uAC00-\uD7AF]/g)?.length ?? 0) > 5) targetLang = 'Korean';
      else if ((sample.match(/[\u4E00-\u9FFF]/g)?.length ?? 0) > 5) targetLang = 'Chinese';
      else if ((sample.match(/[\u0900-\u097F]/g)?.length ?? 0) > 5) targetLang = 'Hindi';
      else {
        // For Latin-script languages, detect via common words (need 3+ matches)
        const countMatches = (regex: RegExp) => (sample.match(regex)?.length ?? 0);
        if (countMatches(/\b(og|er|det|som|til|på|har|med|ikke|fra|kan|vil|var|skal|også|eller|dette|denne|etter|mange|andre|noen|hvordan)\b/gi) >= 3) targetLang = 'Norwegian';
        else if (countMatches(/\b(und|der|die|das|ist|ein|eine|nicht|auch|sich|mit|auf|für|werden|haben|sind|wird|kann|nach|über)\b/gi) >= 3) targetLang = 'German';
        else if (countMatches(/\b(les|des|est|une|dans|pour|avec|sont|pas|qui|sur|mais|cette|comme|tout|plus|fait|elle)\b/gi) >= 3) targetLang = 'French';
        else if (countMatches(/\b(los|las|una|del|que|con|por|para|está|son|más|como|pero|tiene|esta|todo|entre|desde|sobre)\b/gi) >= 3) targetLang = 'Spanish';
        else if (countMatches(/\b(het|een|van|zijn|deze|worden|niet|ook|voor|maar|wel|nog|dan|bij|tot|meer|uit|wordt|kan|als)\b/gi) >= 3) targetLang = 'Dutch';
        else if (countMatches(/\b(och|är|att|det|som|för|med|har|till|den|inte|kan|sig|från|ett|alla|ska)\b/gi) >= 3) targetLang = 'Swedish';
        else if (countMatches(/\b(og|det|som|til|har|med|ikke|fra|kan|vil|var|skal|denne|efter|alle|mange|andre|blev)\b/gi) >= 3) targetLang = 'Danish';
        else if (countMatches(/\b(ja|on|ei|se|että|oli|kun|niin|hän|sitten|mutta|tai|ovat|voi|myös|nyt|kuin)\b/gi) >= 3) targetLang = 'Finnish';
        else if (countMatches(/\b(di|il|che|non|sono|per|una|del|con|più|anche|come|questo|dalla|della|alla|nella|sulla)\b/gi) >= 3) targetLang = 'Italian';
        else if (countMatches(/\b(não|para|com|uma|dos|das|por|mais|como|tem|foi|está|são|mas|entre|até)\b/gi) >= 3) targetLang = 'Portuguese';
      }
    }
    console.log('[Summarize API] Output language:', outputLanguage, '→', targetLang || 'auto-detect (will match input)');

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

    // Build the language instruction for the system prompt
    const langForSystem = targetLang
      ? `ABSOLUTE RULE: You MUST write the ENTIRE summary in ${targetLang}. Every heading, bullet, and sentence MUST be in ${targetLang}. NEVER use English unless ${targetLang} IS English.`
      : `ABSOLUTE RULE: Detect what language the input text is written in, then write your ENTIRE summary in that SAME language. NEVER default to English. If the input is Norwegian, output Norwegian. If Spanish, output Spanish. Match the input language exactly.`;

    const prompt = `Create a comprehensive, well-structured summary of this ${srcLabel}.

LENGTH REQUIREMENT: ${lengthInstruction}

Include ALL key concepts, definitions, terms, important names, dates, numbers, statistics, main arguments, theories, explanations, specific examples, context, and relationships between concepts.

FORMAT — Follow this EXACT structure:

1. Title Line: Start with a relevant emoji + title (e.g. "📖 Complete Overview: Photosynthesis")

2. "📋 Overview" section (2-3 sentences explaining what this content covers)

3. Content Sections — Break into logical topic sections. Each section MUST have:
   - Emoji + clear heading (e.g. "🧪 Chemical Process", "📊 Statistical Analysis")
   - Multiple bullet points (•) with DETAILED information (1-2 sentences each)
   - Sub-bullets (◦) for related details when needed

4. "💡 Key Takeaways" — Final section with 3-5 sentences summarizing the most important points

FORMAT RULES:
• Use emojis for all section headings
• Every point uses a bullet (•), sub-points use (◦)
• NO markdown formatting (no **, ##, __)
• NO meta-text like "Here is a summary" — start directly with the title

INPUT:
${text}`;

    // Use Gemini 2.5 Flash with proper systemInstruction for language enforcement
    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: {
        role: 'system',
        parts: [{ text: `You are an expert academic summarizer that creates comprehensive study summaries.\n\n${langForSystem}` }],
      },
    });

    const completion = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
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
