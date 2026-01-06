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
 * Optimized: Direct update without fetching first
 */
async function incrementUsageCounters(userId: string, isNewSet: boolean = false): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    // Get current values first
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("daily_ai_count, study_set_count")
      .eq("id", userId)
      .single();

    if (fetchError || !currentUser) {
      console.error("Error fetching user for increment:", fetchError);
      return;
    }

    // Update with incremented values
    const { error } = await supabase
      .from("users")
      .update({
        daily_ai_count: currentUser.daily_ai_count + 1,
        ...(isNewSet && { study_set_count: currentUser.study_set_count + 1 })
      })
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
  language: string = "English",
  targetGrade?: string,
  subject?: string
): Promise<Flashcard[]> {
  // Determine answer complexity based on grade
  let answerGuidance = "";
  let vocabularyLevel = "";
  
  if (targetGrade) {
    const grade = targetGrade.toUpperCase();
    
    if (grade === "A" || grade === "6") {
      // Highest grade - detailed, terminology-rich
      answerGuidance = "Answers must be 2-4 concise sentences with proper subject terminology and brief explanations. Include context where relevant.";
      vocabularyLevel = "Use advanced subject-specific vocabulary and technical terms.";
    } else if (grade === "B" || grade === "5") {
      answerGuidance = "Answers should be 2-3 sentences with clear terminology. Balance detail with clarity.";
      vocabularyLevel = "Use subject terminology but keep language accessible.";
    } else if (grade === "C" || grade === "4") {
      answerGuidance = "Answers should be 1-2 sentences. Use clear, direct language.";
      vocabularyLevel = "Use simpler vocabulary with occasional subject terms.";
    } else {
      // D, E, F or grades 1-3 - keep it simple
      answerGuidance = "Answers must be short: 1 sentence maximum. Use simple, clear language.";
      vocabularyLevel = "Avoid complex vocabulary. Keep it age-appropriate and straightforward.";
    }
  } else {
    // Default: medium complexity
    answerGuidance = "Answers should be 1-2 clear sentences.";
    vocabularyLevel = "Use clear, accessible language.";
  }

  const systemPrompt = `You are an expert educational assistant creating study materials${subject ? ` for ${subject}` : ""}.
Create ${numberOfFlashcards} flashcards in ${language} based on the provided text.
EXPAND on the topic - include WHO, WHAT, WHEN, WHERE, WHY, HOW, definitions, and key concepts.

ANSWER QUALITY RULES:
${answerGuidance}
${vocabularyLevel}
- Stay revision-friendly (not essays)
- Include brief explanations or context when helpful
- Use precise terminology appropriate for the content

QUIZ/TEST QUALITY RULES (for distractors):
- Create 3 plausible wrong answers that could genuinely confuse someone who partially understands the topic
- ALL 4 choices must be similar in length and structure
- Distractors should be:
  * Related concepts or common misconceptions
  * Grammatically parallel to the correct answer
  * Not obviously wrong through process of elimination
- Make it genuinely challenging - test understanding, not just recognition

JSON format:
{
  "flashcards": [
    {"id": "1", "question": "specific question", "answer": "appropriate length answer", "distractors": ["plausible wrong answer", "plausible wrong answer", "plausible wrong answer"]},
    {"id": "2", "question": "specific question", "answer": "appropriate length answer", "distractors": ["plausible wrong answer", "plausible wrong answer", "plausible wrong answer"]}
  ]
}`;

  try {
    console.log("[API /generate] Starting OpenAI request...");
    const startTime = Date.now();
    
    // Add timeout wrapper for OpenAI API call (longer for slow networks)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout - AI service took too long to respond")), 120000); // 2 minutes
    });

    const completionPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 3500, // Reduced from 4500 for faster response on slow networks
      response_format: { type: "json_object" },
    });

    const completion = await Promise.race([completionPromise, timeoutPromise]) as any;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[API /generate] OpenAI responded in ${elapsed}s`);

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
      console.log("[API /generate] Attempting to repair JSON...");
      
      // Try multiple repair strategies
      let repairedContent = content.trim();
      
      // Strategy 1: Remove any markdown code blocks
      repairedContent = repairedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Strategy 2: Extract JSON object or array
      const objectMatch = repairedContent.match(/\{[\s\S]*\}/);
      const arrayMatch = repairedContent.match(/\[[\s\S]*\]/);
      
      if (objectMatch) {
        repairedContent = objectMatch[0];
      } else if (arrayMatch) {
        repairedContent = `{"flashcards": ${arrayMatch[0]}}`;
      }
      
      // Strategy 3: Fix common JSON issues
      // Remove trailing commas before closing brackets/braces
      repairedContent = repairedContent.replace(/,(\s*[\]}])/g, '$1');
      
      // Strategy 4: Ensure proper closing brackets
      const openBraces = (repairedContent.match(/\{/g) || []).length;
      const closeBraces = (repairedContent.match(/\}/g) || []).length;
      const openBrackets = (repairedContent.match(/\[/g) || []).length;
      const closeBrackets = (repairedContent.match(/\]/g) || []).length;
      
      if (openBrackets > closeBrackets) {
        repairedContent += ']'.repeat(openBrackets - closeBrackets);
      }
      if (openBraces > closeBraces) {
        repairedContent += '}'.repeat(openBraces - closeBraces);
      }
      
      // Try parsing repaired content
      try {
        parsed = JSON.parse(repairedContent);
        console.log("[API /generate] ✅ Successfully repaired and parsed JSON");
      } catch (e2) {
        console.error("[API /generate] ❌ JSON repair failed:", e2);
        console.log("[API /generate] First 500 chars:", content.substring(0, 500));
        console.log("[API /generate] Last 500 chars:", content.substring(Math.max(0, content.length - 500)));
        throw new Error("Could not parse AI response as JSON. The AI may have returned incomplete or malformed data. Please try again.");
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
    console.error("[API /generate] AI generation error:", error);
    console.error("[API /generate] Error code:", error.code);
    console.error("[API /generate] Error message:", error.message);
    
    // Provide more helpful error messages based on error type
    if (error.message?.includes("timeout") || error.message?.includes("Request timeout") || error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new Error("Connection timeout - AI service took too long. Try again with shorter text or fewer flashcards.");
    }
    if (error.message?.includes("ECONNREFUSED") || error.message?.includes("ENOTFOUND") || error.message?.includes("Connection error")) {
      throw new Error("Cannot connect to AI service. Check your internet connection and try again.");
    }
    if (error.message?.includes("429") || error.status === 429) {
      throw new Error("Too many requests to AI service. Please wait a moment and try again.");
    }
    if (error.message?.includes("401") || error.status === 401) {
      throw new Error("AI service authentication failed. Please contact support.");
    }
    if (error.message?.includes("500") || error.message?.includes("503") || error.status === 500 || error.status === 503) {
      throw new Error("AI service is temporarily unavailable. Please try again in a moment.");
    }
    
    // Generic fallback with original error message
    throw new Error(`AI generation failed: ${error.message || "Unknown error occurred. Please try again."}`);
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

    // STEP 0: Get user from database first (needed for rate limit check)
    let userStatus = await getOrCreateUser(userId);
    if (!userStatus) {
      return NextResponse.json(
        { error: "Failed to get user status" },
        { status: 500 }
      );
    }

    // ANTI-ABUSE: Rate limit by USER ID (not IP - prevents one user blocking everyone on same network)
    const maxRequests = getRateLimitForUser(userStatus.isPremium, userId.startsWith('anon_') || userId.startsWith('anon-'));
    const rateCheck = checkRateLimit(userId, maxRequests);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `You've reached your daily generation limit. Try again in ${formatResetTime(rateCheck.resetAt)}.`,
          code: "RATE_LIMIT_EXCEEDED",
          resetAt: rateCheck.resetAt,
          isPremium: userStatus.isPremium,
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

    // STEP 1: Reset daily counter if new day
    userStatus = await resetDailyCounterIfNeeded(userStatus);

    // STEP 2: Check flashcard count limit (FREE users only, SKIP for notes)
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

    // STEP 3: Check if user can use AI (SKIP for notes - they're always free)
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

    // STEP 4: Generate flashcards with GPT-4o mini
    const flashcards = await generateWithAI(
      text, 
      numberOfFlashcards, 
      language || "English",
      targetGrade,
      subject
    );

    // STEP 5: Increment usage counters (fire-and-forget - don't wait)
    const isNewSet = userStatus.studySetCount < FREE_LIMITS.maxStudySets || userStatus.isPremium;
    incrementUsageCounters(userId, isNewSet).catch(err => console.error("Counter increment failed:", err));

    // Return success immediately
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
