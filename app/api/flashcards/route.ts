/**
 * /api/flashcards - LEGACY ENDPOINT (Wrapper around /api/generate)
 * 
 * This endpoint now delegates to /api/generate for all AI operations.
 * Kept for backward compatibility with existing frontend code.
 * 
 * IMPORTANT: All premium checks happen in /api/generate
 */

import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes for batched generation (Vercel free tier limit)
export const maxDuration = 300;

interface FlashcardRequest {
  text: string;
  numberOfFlashcards: number;
  subject?: string;
  targetGrade?: string;
  difficulty?: string;
  userId?: string;
  materialType?: string;
}

/**
 * POST /api/flashcards
 * Wrapper that delegates to /api/generate
 */
export async function POST(req: NextRequest) {
  try {
    const body: FlashcardRequest = await req.json();
    const { text, numberOfFlashcards, subject, targetGrade, difficulty, userId, materialType } = body;

    // Validate required fields
    if (!text || !numberOfFlashcards) {
      return NextResponse.json(
        { error: "Missing required fields: text, numberOfFlashcards" },
        { status: 400 }
      );
    }

    // Get userId from body or generate anonymous ID
    const effectiveUserId = userId || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Detect language from text (simple detection)
    const language = detectLanguage(text);

    // Call /api/generate (the real AI gateway with premium enforcement)
    const generateUrl = new URL("/api/generate", req.url);
    
    // Add timeout to prevent hanging requests (allow time for batched generation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for large batches
    
    try {
      const generateResponse = await fetch(generateUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: effectiveUserId,
          text,
          numberOfFlashcards,
          subject,
          targetGrade,
          difficulty,
          language,
          materialType: materialType || "notes",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await generateResponse.json();

      // Forward the response status and data
      if (!generateResponse.ok) {
        return NextResponse.json(data, { status: generateResponse.status });
      }

      // Return flashcards (unwrap from generate response)
      return NextResponse.json(data.flashcards || data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("[API /flashcards] Request timeout");
        return NextResponse.json(
          { error: "Connection timeout - request took too long. Try again with shorter text." },
          { status: 504 }
        );
      }
      
      console.error("[API /flashcards] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Connection error - unable to reach AI service. Check your internet connection." },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("Flashcards API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}

/**
 * Detect language from text (basic detection)
 */
function detectLanguage(text: string): string {
  const sample = text.slice(0, 500).toLowerCase();

  // Norwegian indicators
  const norwegianWords = ["og", "er", "det", "på", "til", "med", "som", "å", "ikke", "har"];
  const norwegianChars = ["æ", "ø", "å"];

  // Spanish indicators
  const spanishWords = ["el", "la", "de", "que", "es", "en", "un", "una", "por", "para"];
  const spanishChars = ["ñ", "á", "é", "í", "ó", "ú"];

  // Count occurrences
  let norwegianScore = 0;
  let spanishScore = 0;

  norwegianWords.forEach((word) => {
    if (sample.includes(` ${word} `)) norwegianScore += 2;
  });
  norwegianChars.forEach((char) => {
    norwegianScore += (sample.split(char).length - 1) * 3;
  });

  spanishWords.forEach((word) => {
    if (sample.includes(` ${word} `)) spanishScore += 2;
  });
  spanishChars.forEach((char) => {
    spanishScore += (sample.split(char).length - 1) * 3;
  });

  // Determine language
  if (norwegianScore > 5) return "Norwegian";
  if (spanishScore > 5) return "Spanish";

  return "English"; // Default
}
