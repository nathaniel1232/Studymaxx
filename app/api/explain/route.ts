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
    const { question, correctAnswer, userAnswer, language } = await request.json();

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const langInstruction = language && language !== 'en' && language !== 'auto'
      ? `Respond in the same language as the question.`
      : `Respond in the SAME language as the question. Match the question's language exactly.`;

    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: {
        role: 'system',
        parts: [{ text: `You are a helpful tutor explaining why an answer is wrong. Keep explanations brief (1-2 sentences), clear, and educational. ${langInstruction}` }],
      },
    });

    const completion = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Question: "${question}"
Correct answer: "${correctAnswer}"
Student answered: "${userAnswer}"

Briefly explain why the correct answer is right (max 50 words). Be concise and direct.`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    });

    const response = completion.response;
    const explanation = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
