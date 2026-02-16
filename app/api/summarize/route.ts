import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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

    const prompt = `You are an expert academic summarizer. Create a comprehensive, well-structured summary of this ${srcLabel}.

CRITICAL LANGUAGE RULE:
Write the summary in the SAME language as the input text. If input is Norwegian, write in Norwegian. If English, write in English. NEVER mix languages. Match the input language EXACTLY.

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

INPUT:
${text}

SUMMARY:`;

    // Use OpenAI GPT-4o-mini for summarization
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic summarizer. Generate comprehensive, well-structured summaries that help students learn effectively.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: length === 'long' ? 8192 : length === 'medium' ? 5120 : 3072,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '';

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
