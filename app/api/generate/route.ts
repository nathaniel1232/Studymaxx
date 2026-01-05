/**
 * /api/generate - CENTRAL AI GATEWAY
 * 
 * ALL AI requests MUST go through this endpoint.
 * This is the ONE TRUTH for enforcing premium limits and protecting costs.
 * 
 * Flow:
 * 1. Get user from database
 * 2. Reset daily counter if new day
 * 3. Check if user can use AI (premium limits)
 * 4. Call GPT-4o mini with cost controls
 * 5. Increment counters on success
 * 6. Return flashcards
 */

import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabase";
import {
  canUseAI,
  validateFlashcardCount,
  shouldResetDailyCounter,
  FREE_LIMITS,
  type UserStatus,
} from "@/app/utils/premium";
import {
  getClientIP,
  checkRateLimit,
  getRateLimitForUser,
  formatResetTime,
} from "@/app/utils/rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GenerateRequest {
  userId: string;
  text: string;
  numberOfFlashcards: number;
  subject?: string;
  targetGrade?: string;
  difficulty?: string;
  language?: string;
  materialType?: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  distractors?: string[];
}

/**
 * Get or create user in database
 * For anonymous users (starting with 'anon_'), return a default free user status
 */
async function getOrCreateUser(userId: string): Promise<UserStatus | null> {
  // For anonymous users, return default free tier status without database
  if (userId.startsWith('anon_') || userId.startsWith('anon-')) {
    console.log("[API /generate] Anonymous user detected, using local limits");
    return {
      id: userId,
      isPremium: false,
      studySetCount: 0,
      dailyAiCount: 0,
      lastAiReset: new Date(),
    };
  }

  if (!supabase) {
    console.error("Supabase not configured, using default user status");
    return {
      id: userId,
      isPremium: false,
      studySetCount: 0,
      dailyAiCount: 0,
      lastAiReset: new Date(),
    };
  }

  try {
    // Try to get existing user
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      return {
        id: data.id,
        isPremium: data.is_premium || false,
        studySetCount: data.study_set_count || 0,
        dailyAiCount: data.daily_ai_count || 0,
        lastAiReset: new Date(data.last_ai_reset || new Date()),
        email: data.email,
        accountId: data.account_id,
      };
    }

    // Create new user if not exists
    if (error?.code === "PGRST116") {
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: userId,
          is_premium: false,
          study_set_count: 0,
          daily_ai_count: 0,
          last_ai_reset: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        // Return default status instead of null
        return {
          id: userId,
          isPremium: false,
          studySetCount: 0,
          dailyAiCount: 0,
          lastAiReset: new Date(),
        };
      }

      return {
        id: newUser.id,
        isPremium: false,
        studySetCount: 0,
        dailyAiCount: 0,
        lastAiReset: new Date(),
      };
    }

    console.error("Error fetching user:", error);
    // Return default status instead of null
    return {
      id: userId,
      isPremium: false,
      studySetCount: 0,
      dailyAiCount: 0,
      lastAiReset: new Date(),
    };
  } catch (err) {
    console.error("Exception in getOrCreateUser:", err);
    // Return default status instead of null
    return {
      id: userId,
      isPremium: false,
      studySetCount: 0,
      dailyAiCount: 0,
      lastAiReset: new Date(),
    };
  }
}

/**
 * Reset daily AI counter if needed
 */
async function resetDailyCounterIfNeeded(userStatus: UserStatus): Promise<UserStatus> {
  if (!supabase) {
    return userStatus;
  }

  if (shouldResetDailyCounter(userStatus.lastAiReset)) {
    // Reset the counter
    const { error } = await supabase
      .from("users")
      .update({
        daily_ai_count: 0,
        last_ai_reset: new Date().toISOString(),
      })
      .eq("id", userStatus.id);

    if (error) {
      console.error("Error resetting daily counter:", error);
    } else {
      // Update local object
      userStatus.dailyAiCount = 0;
      userStatus.lastAiReset = new Date();
    }
  }

  return userStatus;
}

/**
 * Increment usage counters after successful AI generation
 */
async function incrementUsageCounters(userId: string, isNewSet: boolean = false): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    // First, get current values
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("daily_ai_count, study_set_count")
      .eq("id", userId)
      .single();

    if (fetchError || !currentUser) {
      console.error("Error fetching user for increment:", fetchError);
      return;
    }

    // Prepare update
    const updates: any = {
      daily_ai_count: currentUser.daily_ai_count + 1,
    };

    if (isNewSet) {
      updates.study_set_count = currentUser.study_set_count + 1;
    }

    // Update with new values
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error incrementing counters:", error);
    }
  } catch (err) {
    console.error("Exception incrementing counters:", err);
  }
}

/**
 * Generate flashcards using GPT-4o mini with cost controls
 */
async function generateWithAI(
  text: string,
  numberOfFlashcards: number,
  language: string = "English"
): Promise<Flashcard[]> {
  const systemPrompt = `You are an expert educational assistant that creates high-quality flashcards.
Create ${numberOfFlashcards} flashcards in ${language} based on the provided text.
Each flashcard should have a clear question, a comprehensive answer, and 3 plausible wrong answers (distractors).
Return a JSON object with a "flashcards" array containing flashcard objects.

Example format:
{
  "flashcards": [
    {"id": "1", "question": "What is...", "answer": "The answer is...", "distractors": ["Wrong1", "Wrong2", "Wrong3"]},
    {"id": "2", "question": "How does...", "answer": "It works by...", "distractors": ["Wrong1", "Wrong2", "Wrong3"]}
  ]
}

Rules for QUESTIONS:
- Clear and specific
- Test conceptual understanding
- Avoid ambiguous phrasing

Rules for ANSWERS:
- Concise but complete
- Use precise terminology
- Match the language length of distractors

Rules for DISTRACTORS (wrong answers):
- **CRITICAL**: Make them plausible and educationally valuable
- Each should be a common misconception or related concept
- Use same language structure and complexity as correct answer
- Differ in meaning, not just length or formatting
- Should require actual knowledge to distinguish from the correct answer
- Avoid obviously wrong answers
- Test understanding, not trick the student

Example:
Question: "What is photosynthesis?"
Correct: "Process where plants convert light energy into chemical energy"
Distractors: [
  "Process where plants absorb nutrients from soil",
  "Process where plants break down glucose for energy",
  "Process where plants release oxygen at night"
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    const finishReason = completion.choices[0]?.finish_reason;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Check if response was truncated due to token limit
    if (finishReason === 'length') {
      console.warn("[API /generate] ⚠️ Response truncated due to token limit. Attempting to parse incomplete JSON...");
      // Try to fix incomplete JSON by closing brackets
      let fixedContent = content.trim();
      
      // Count opening and closing braces/brackets
      const openBraces = (fixedContent.match(/\{/g) || []).length;
      const closeBraces = (fixedContent.match(/\}/g) || []).length;
      const openBrackets = (fixedContent.match(/\[/g) || []).length;
      const closeBrackets = (fixedContent.match(/\]/g) || []).length;
      
      // Add missing closing characters
      if (openBrackets > closeBrackets) {
        fixedContent += ']'.repeat(openBrackets - closeBrackets);
      }
      if (openBraces > closeBraces) {
        fixedContent += '}'.repeat(openBraces - closeBraces);
      }
      
      console.log("[API /generate] Attempting to fix truncated JSON...");
      
      try {
        const parsed = JSON.parse(fixedContent);
        console.log("[API /generate] ✅ Successfully recovered truncated JSON");
        
        const flashcards = Array.isArray(parsed) 
          ? parsed 
          : parsed.flashcards || parsed.cards || parsed.items || [];
        
        if (flashcards.length > 0) {
          console.log("[API /generate] Successfully extracted", flashcards.length, "flashcards from truncated response");
          return flashcards.map((card: any, index: number) => ({
            id: card.id || `${Date.now()}-${index}`,
            question: card.question || card.front || "",
            answer: card.answer || card.back || "",
            distractors: card.distractors || [],
          }));
        }
      } catch (fixError) {
        console.error("[API /generate] Could not fix truncated JSON:", fixError);
      }
    }

    console.log("[API /generate] Response finish reason:", finishReason);
    console.log("[API /generate] Raw AI response length:", content.length, "characters");

    // Parse response
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log("[API /generate] ✅ Parsed JSON structure:", Object.keys(parsed));
    } catch (e) {
      console.error("[API /generate] ❌ JSON parse failed:", e);
      console.log("[API /generate] Full content:", content);
      
      // If it's not valid JSON, try to extract JSON array or object
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      const objectMatch = content.match(/\{[\s\S]*\}/);
      
      if (objectMatch) {
        try {
          parsed = JSON.parse(objectMatch[0]);
          console.log("[API /generate] ✅ Extracted JSON object");
        } catch (e2) {
          console.error("[API /generate] ❌ Could not parse extracted object");
          throw new Error("Could not parse AI response as JSON. The AI may have returned incomplete data.");
        }
      } else if (arrayMatch) {
        try {
          parsed = { flashcards: JSON.parse(arrayMatch[0]) };
          console.log("[API /generate] ✅ Extracted JSON array");
        } catch (e2) {
          console.error("[API /generate] ❌ Could not parse extracted array");
          throw new Error("Could not parse AI response as JSON. The AI may have returned incomplete data.");
        }
      } else {
        throw new Error("Could not parse AI response as JSON. The AI may have returned incomplete data.");
      }
    }

    // Handle different response formats
    const flashcards = Array.isArray(parsed) 
      ? parsed 
      : parsed.flashcards || parsed.cards || parsed.items || [];

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      console.error("[API /generate] No valid flashcards found. Parsed:", parsed);
      throw new Error("AI did not return valid flashcards array");
    }
    
    console.log("[API /generate] Successfully extracted", flashcards.length, "flashcards");

    // Ensure each flashcard has required fields
    return flashcards.map((card: any, index: number) => ({
      id: card.id || `${Date.now()}-${index}`,
      question: card.question || card.front || "",
      answer: card.answer || card.back || "",
      distractors: card.distractors || [],
    }));
  } catch (error: any) {
    console.error("AI generation error:", error);
    // Provide more helpful error messages
    if (error.message?.includes("timeout") || error.code === "ECONNABORTED") {
      throw new Error("AI service took too long to respond. Please try again with a shorter text or fewer flashcards.");
    }
    if (error.message?.includes("429")) {
      throw new Error("Too many requests to AI service. Please wait a moment and try again.");
    }
    throw new Error(`AI generation failed: ${error.message || "Unknown error occurred"}`);
  }
}

/**
 * POST /api/generate
 * Central AI gateway with premium enforcement
 */
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { userId, text, numberOfFlashcards, subject, targetGrade, difficulty, language, materialType } = body;

    // Validate input
    if (!userId || !text || !numberOfFlashcards) {
      return NextResponse.json(
        { error: "Missing required fields: userId, text, numberOfFlashcards" },
        { status: 400 }
      );
    }

    // IMPORTANT: Notes material type has NO LIMITS for free users
    const isNotesOnly = materialType === "notes" || !materialType;

    // ANTI-ABUSE: Rate limit by IP
    const clientIP = getClientIP(req);
    const isPremiumPreCheck = false; // We don't know yet, check conservatively
    const maxRequests = getRateLimitForUser(isPremiumPreCheck);
    const rateCheck = checkRateLimit(clientIP, maxRequests);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests from your IP. Try again in ${formatResetTime(rateCheck.resetAt)}.`,
          code: "RATE_LIMIT_EXCEEDED",
          resetAt: rateCheck.resetAt,
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateCheck.resetAt.toString(),
          }
        }
      );
    }

    // STEP 1: Get user from database
    let userStatus = await getOrCreateUser(userId);
    if (!userStatus) {
      return NextResponse.json(
        { error: "Failed to get user status" },
        { status: 500 }
      );
    }

    // STEP 2: Reset daily counter if new day
    userStatus = await resetDailyCounterIfNeeded(userStatus);

    // STEP 3: Check flashcard count limit (FREE users only, SKIP for notes)
    if (!isNotesOnly) {
      const cardCheck = validateFlashcardCount(numberOfFlashcards, userStatus.isPremium);
      if (!cardCheck.valid) {
        return NextResponse.json(
          {
            error: cardCheck.reason,
            code: "FLASHCARD_LIMIT",
            isPremium: userStatus.isPremium,
          },
          { status: cardCheck.statusCode || 402 }
        );
      }
    }

    // STEP 4: Check if user can use AI (SKIP for notes - they're always free)
    if (!isNotesOnly) {
      const aiCheck = canUseAI(userStatus);
      if (!aiCheck.allowed) {
        return NextResponse.json(
          {
            error: aiCheck.reason,
            code: aiCheck.statusCode === 429 ? "DAILY_LIMIT_REACHED" : "PREMIUM_REQUIRED",
            isPremium: userStatus.isPremium,
            studySetCount: userStatus.studySetCount,
            dailyAiCount: userStatus.dailyAiCount,
          },
          { status: aiCheck.statusCode || 402 }
        );
      }
    }

    // STEP 5: Generate flashcards with GPT-4o mini
    const flashcards = await generateWithAI(text, numberOfFlashcards, language || "English");

    // STEP 6: Increment usage counters (only on success!)
    const isNewSet = userStatus.studySetCount < FREE_LIMITS.maxStudySets || userStatus.isPremium;
    await incrementUsageCounters(userId, isNewSet);

    // Return success
    return NextResponse.json({
      flashcards,
      usage: {
        studySetCount: userStatus.studySetCount + (isNewSet ? 1 : 0),
        dailyAiCount: userStatus.dailyAiCount + 1,
        isPremium: userStatus.isPremium,
      },
    });
  } catch (error: any) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
