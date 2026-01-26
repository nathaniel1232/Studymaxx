import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { question, correctAnswer, userAnswer } = await request.json();

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful tutor explaining why an answer is wrong. Keep explanations brief (1-2 sentences), clear, and educational. Focus on helping the student understand the correct answer without being condescending.

Rules:
- Be concise and direct
- Explain why the correct answer is right
- If relevant, briefly mention why the user's answer was wrong
- Use simple language
- Don't repeat the question or answers in full
- Maximum 50 words`
        },
        {
          role: 'user',
          content: `Question: "${question}"
Correct answer: "${correctAnswer}"
Student answered: "${userAnswer}"

Briefly explain why the correct answer is right.`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const explanation = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
