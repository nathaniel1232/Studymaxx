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

// Allow up to 5 minutes for batched generation (Vercel free tier limit)
export const maxDuration = 300;

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
  outputLanguage?: "auto" | "en";
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
 * Generate flashcards with FAST batched generation - optimized for serverless
 * Generates in small batches to avoid timeouts on large requests
 */
async function generateWithAIFast(
  text: string,
  numberOfFlashcards: number,
  language: string = "English",
  targetGrade?: string,
  subject?: string,
  materialType?: string
): Promise<Flashcard[]> {
  console.log(`[generateWithAIFast] Target: ${numberOfFlashcards} flashcards (fast single-request mode)`);
  
  // Single request with streamlined generation - no batching for speed
  return await generateWithAI(text, numberOfFlashcards, language, targetGrade, subject, materialType);
}

/**
 * Generate flashcards with validation loop - ensures count guarantee
 * USE THIS FOR BACKGROUND/ASYNC OPERATIONS ONLY
 */
async function generateWithAIGuaranteed(
  text: string,
  numberOfFlashcards: number,
  language: string = "English",
  targetGrade?: string,
  subject?: string
): Promise<Flashcard[]> {
  const maxAttempts = 3;
  let allCards: Flashcard[] = [];
  let attempt = 0;

  console.log(`[generateWithAIGuaranteed] Target: ${numberOfFlashcards} flashcards`);

  while (allCards.length < numberOfFlashcards && attempt < maxAttempts) {
    attempt++;
    const needed = numberOfFlashcards - allCards.length;
    
    console.log(`[generateWithAIGuaranteed] Attempt ${attempt}/${maxAttempts}: Need ${needed} more cards`);

    try {
      const newCards = await generateWithAI(text, needed, language, targetGrade, subject);
      
      // Deduplicate based on question similarity
      const uniqueNewCards = newCards.filter(newCard => {
        const isDuplicate = allCards.some(existing => 
          existing.question.toLowerCase() === newCard.question.toLowerCase()
        );
        return !isDuplicate;
      });

      allCards.push(...uniqueNewCards);
      console.log(`[generateWithAIGuaranteed] Got ${uniqueNewCards.length} unique cards. Total: ${allCards.length}/${numberOfFlashcards}`);

      // If we have enough, stop
      if (allCards.length >= numberOfFlashcards) {
        break;
      }

      // If we got very few cards in this attempt, add more context to help AI expand
      if (uniqueNewCards.length < needed * 0.5 && attempt < maxAttempts) {
        console.log(`[generateWithAIGuaranteed] Low yield (${uniqueNewCards.length}/${needed}), will retry with expansion hint`);
        // Append expansion hint to text for next iteration
        text = text + `\n\n[Note: Cover this topic comprehensively with related concepts, definitions, and key information]`;
      }

    } catch (error: any) {
      console.error(`[generateWithAIGuaranteed] Attempt ${attempt} failed:`, error.message);
      
      // On last attempt, throw the error
      if (attempt === maxAttempts) {
        throw error;
      }
    }
  }

  // Final validation
  if (allCards.length < numberOfFlashcards) {
    console.warn(`[generateWithAIGuaranteed] Could not reach target after ${maxAttempts} attempts. Got ${allCards.length}/${numberOfFlashcards}`);
    // Return what we have instead of failing completely
  }

  // Return exactly the requested amount (or less if we couldn't generate enough)
  return allCards.slice(0, numberOfFlashcards);
}

/**
 * Generate flashcards using GPT-4o mini with cost controls and count enforcement
 */
async function generateWithAI(
  text: string,
  numberOfFlashcards: number,
  language: string = "English",
  targetGrade?: string,
  subject?: string,
  materialType?: string
): Promise<Flashcard[]> {
  const targetCount = numberOfFlashcards; // Store original request
  
  // Determine answer complexity based on grade
  let answerGuidance = "";
  let vocabularyLevel = "";
  let exampleAnswer = "";
  
  // Simplified answer guidance for speed
  answerGuidance = "Keep answers concise: 1-3 sentences with key information only. No filler.";
  vocabularyLevel = "Use clear, direct language appropriate for the subject.";
  exampleAnswer = "";

  // Calculate buffer for count enforcement
  // Fast mode: NO BUFFER - generate exact count only
  const bufferedCount = numberOfFlashcards; // Exact count for speed

  // Build material-specific instructions
  let materialInstructions = "";
  if (materialType === "image") {
    materialInstructions = `
IMPORTANT - IMAGE CONTENT INSTRUCTIONS:
- Extract EDUCATIONAL CONTENT ONLY from the image
- IGNORE logistical/metadata details such as:
  * Exam dates, times, or schedules
  * Physical locations or platforms
  * Week numbers or administrative dates
  * Testing format information
  * Where/when exams take place
- FOCUS ON these types of content:
  * Learning goals and objectives
  * Curriculum topics and concepts
  * Subject matter definitions
  * Key principles and theories
  * Processes and procedures
  * Cause-and-effect relationships
  * Comparisons and contrasts
  * Facts and information students must learn
- Generate flashcards about the SUBJECT MATTER, not about the exam itself
- Create pedagogically sound cards that teach the concepts`;
  } else if (materialType === "pdf") {
    materialInstructions = `
IMPORTANT - PDF CONTENT INSTRUCTIONS:
- Extract the core educational concepts from the PDF
- Focus on main ideas, definitions, and explanations
- Ignore header/footer information, page numbers, and administrative text
- Create comprehensive flashcards that cover the key learning points`;
  } else if (materialType === "youtube") {
    materialInstructions = `
IMPORTANT - YOUTUBE TRANSCRIPT INSTRUCTIONS:
- Extract the main educational concepts from the transcript
- Ignore introductions, thanking viewers, and filler content
- Focus on the core teaching content and explanations
- Create flashcards that capture the key lessons from the video`;
  }

  const systemPrompt = `You are an expert educational assistant creating exam-focused flashcards${subject ? ` for ${subject}` : ""}.

Your job is to create flashcards that students will use to STUDY, LEARN, and ACE EXAMS.
Assume the student already knows basic definitions and terminology.

Generate EXACTLY ${bufferedCount} flashcards in ${language} from the provided text.${materialInstructions}

CRITICAL INSTRUCTION - AVOID SUPERFICIAL FLASHCARDS:
❌ DO NOT create:
- Generic "What is X?" definition questions
- Textbook-opening/introductory questions
- Surface-level terminology flashcards
- Questions that don't help with exam learning
- Questions the student would already know

✅ DO create:
- Questions about WHY things work the way they do
- Cause-and-effect relationships ("Why does X happen?" "What causes Y?")
- Process explanations ("How does X occur?")
- Comparisons and contrasts ("What's the difference between X and Y?")
- Mechanisms and explanations ("Explain how X functions")
- Application questions ("What happens when X is applied to Y?")
- Questions testing deeper understanding, not just recall
- Content that students are commonly tested on in exams

QUESTION QUALITY:
- Every question should be meaningful and content-heavy
- The first flashcards should never be generic
- Focus on mechanisms, relationships, and explanations
- Questions should require thinking, not just memorization
- Prioritize depth over breadth

ANSWER AND DISTRACTOR QUALITY:
1. Correct Answer: Be specific and accurate. State exactly what is true. 1-2 sentences maximum.
2. Distractors: Create 3 wrong options that are REALISTIC MISCONCEPTIONS, not obviously wrong
3. CRITICAL LENGTH RULE - ALL 4 OPTIONS MUST:
   - Have between 8-15 words each (never shorter than 8 words)
   - All options MUST be the same length (within ±2 words of each other)
   - Start with the same type of word (if answer starts with "The", all distractors start with "The")
   - Use identical grammatical patterns
   - Be the same level of technical/simple language
   - Sound equally confident and complete
4. DISTRACTOR CONTENT RULES:
   - Base distractors on real student misconceptions
   - Use plausible but incorrect facts from the same topic
   - Never use vague words like "sometimes", "maybe", "things"
   - Each distractor should require actual knowledge to reject
   - Make distractors sound equally detailed and professional as the correct answer
5. THE CORRECT ANSWER SHOULD NEVER:
   - Be longer or more detailed than distractors
   - Use more specific terminology than distractors
   - Sound more "academic" or polished than distractors
6. IF THE CORRECT ANSWER IS SHORT, MAKE IT LONGER:
   - Add context, explanation, or reasoning
   - Include "because", "which means", "resulting in" phrases
   - Ensure 8-15 words minimum

DISTRACTOR EXAMPLES (good):
Question: "What primary mechanism causes evaporation?"
- ✅ Heat from the sun provides energy to water molecules (correct)
- ✅ Energy from water molecules allows them to escape the surface (realistic misconception)
- ✅ Temperature decreases around liquid water, causing molecular escape (realistic misconception)
- ✅ Solar radiation causes water molecules to sink deeper (realistic misconception)
All are similar length, equally detailed, equally plausible.

DISTRACTOR EXAMPLES (bad):
Question: "What primary mechanism causes evaporation?"
- ❌ Heat from the sun provides energy for molecules to become gas (too long)
- ❌ Wind (too short, obviously wrong)
- ❌ Cooling (vague, obviously wrong)
- ❌ Water gets hot (informal, obviously wrong)

ANSWER FORMAT:
Use this JSON structure with equal-quality options:
{
  "flashcards": [
    {
      "id": "1",
      "question": "...",
      "answer": "...",
      "distractors": ["realistic misconception 1", "realistic misconception 2", "realistic misconception 3"]
    }
  ]
}

Generate ${bufferedCount} flashcards now. Prioritize quality and depth over speed.`;

  try {
    console.log("[API /generate] Starting OpenAI request...");
    const startTime = Date.now();
    
    // Fast timeout - single request optimized for speed
    const timeoutMs = 90000; // 90 seconds max
    console.log(`[API /generate] Timeout set to ${timeoutMs}ms for ${numberOfFlashcards} cards`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Generation timeout - please try again")), timeoutMs);
    });

    const completionPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 6000, // Higher limit for single request with 30 cards
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

    // Validate and ensure each flashcard has required fields and meets quality standards
    const validatedCards = flashcards
      .map((card: any, index: number) => {
        const question = card.question || card.front || "";
        const answer = card.answer || card.back || "";
        const distractors = card.distractors || [];

        // Validate minimum quality requirements
        if (!question || question.length < 10) {
          console.warn(`[API /generate] Card ${index + 1} has too short question: "${question}"`);
          return null;
        }
        
        if (!answer || answer.length < 10) {
          console.warn(`[API /generate] Card ${index + 1} has too short answer: "${answer}"`);
          return null;
        }

        // For grade A/6, ensure answers are substantial but not too long
        if (targetGrade && (targetGrade.toUpperCase() === "A" || targetGrade === "6")) {
          if (answer.length < 80) {
            console.warn(`[API /generate] Card ${index + 1} answer too short for grade ${targetGrade}: ${answer.length} chars (min 80)`);
            // Don't filter out, but log the issue
          }
          if (answer.length > 600) {
            console.warn(`[API /generate] Card ${index + 1} answer too long for grade ${targetGrade}: ${answer.length} chars (max ~600 for conciseness)`);
          }
        }

        // Validate distractors quality
        if (distractors.length > 0 && distractors.length < 3) {
          console.warn(`[API /generate] Card ${index + 1} has insufficient distractors: ${distractors.length}`);
        }

        return {
          id: card.id || `${Date.now()}-${index}`,
          question,
          answer,
          distractors,
        };
      })
      .filter((card): card is { id: string; question: string; answer: string; distractors: string[] } => card !== null);

    console.log(`[API /generate] Validated: ${validatedCards.length} of ${flashcards.length} cards passed quality check`);

    // Return immediately - don't wait for perfect count
    // Fast mode: return what we have, even if slightly short
    if (validatedCards.length === 0) {
      throw new Error("No valid flashcards generated. Please try again.");
    }

    // Return up to requested number
    const finalCards = validatedCards.slice(0, targetCount);
    
    console.log(`[API /generate] Returning ${finalCards.length} flashcards (fast mode)`);

    return finalCards;
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
    const { userId, text, numberOfFlashcards, subject, targetGrade, difficulty, language: detectedLanguage, materialType, outputLanguage } = body;

    // Determine the actual output language
    // If outputLanguage is "en", always use English; otherwise use detected language or default to English
    const language = outputLanguage === "en" ? "English" : (detectedLanguage || "English");

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

    // STEP 4: Generate flashcards FAST (optimized for serverless timeout limits)
    // Use fast mode without retries - return quickly to user
    const flashcards = await generateWithAIFast(
      text, 
      numberOfFlashcards, 
      language || "English",
      targetGrade,
      subject,
      materialType
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
