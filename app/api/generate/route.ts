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
  includeMath?: boolean;
  knownLanguage?: string;
  learningLanguage?: string;
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
  materialType?: string,
  outputLanguage: "auto" | "en" = "auto",
  difficulty?: string,
  includeMath?: boolean,
  knownLanguage?: string,
  learningLanguage?: string
): Promise<Flashcard[]> {
  console.log(`[generateWithAIFast] Target: ${numberOfFlashcards} flashcards (fast single-request mode)`);
  
  // Single request with streamlined generation - no batching for speed
  return await generateWithAI(text, numberOfFlashcards, language, targetGrade, subject, materialType, outputLanguage, difficulty, includeMath, knownLanguage, learningLanguage);
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
  materialType?: string,
  outputLanguage: "auto" | "en" = "auto",
  difficulty?: string,
  includeMath?: boolean,
  knownLanguage?: string,
  learningLanguage?: string
): Promise<Flashcard[]> {
  const targetCount = numberOfFlashcards; // Store original request
  
  // Determine answer complexity based on grade
  let answerGuidance = "";
  let vocabularyLevel = "";
  let exampleAnswer = "";
  
  // Simplified answer guidance for speed
  answerGuidance = "Keep answers VERY concise: Max 15-20 words. Core facts only. No filler.";
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

  // Build Difficulty instructions
  let difficultyInstructions = "";
  if (difficulty === "Easy") {
    difficultyInstructions = `⚠️ DIFFICULTY LEVEL: EASY (STRICTLY FOUNDATIONAL - NO EXCEPTIONS)
CRITICAL REQUIREMENTS FOR EASY MODE:
- Questions: ONLY "What is...", "Define...", "Identify...", "Name..."
- Content: Basic definitions, simple facts, straightforward recall
- Math: Single-step calculations only (e.g., "2 + 2 = ?", "What is 5 x 3?")
- NO analysis, NO synthesis, NO complex reasoning
- Example Easy Questions:
  * "What is photosynthesis?"
  * "Name the capital of France"
  * "What is 15 + 7?"
- Distractors: Obviously wrong but topically related (e.g., for "Paris", use "London", "Berlin")`;
  } else if (difficulty === "Hard") {
    difficultyInstructions = `⚠️ DIFFICULTY LEVEL: HARD (CHALLENGING BUT ANSWERABLE - NO EXCEPTIONS)

🚫 FORBIDDEN IN HARD MODE (These don't work for flashcards!):
- "Analyze...", "Evaluate...", "Discuss...", "Compare and contrast..."
- Open-ended questions without a single correct answer
- Questions requiring essay-style responses

✅ WHAT HARD MODE ACTUALLY MEANS:
- Questions that test DEEP KNOWLEDGE with SPECIFIC ANSWERS
- Tricky details that only someone who studied well would know
- Questions about exceptions, edge cases, and nuances
- Multi-part facts combined into one question
- Questions where all 4 options look very similar/plausible

HARD MODE QUESTION TYPES:
1. TRICKY SPECIFICS: "What is the EXACT percentage of oxygen in Earth's atmosphere?" (Answer: 20.95%, not just "about 21%")
2. EXCEPTIONS TO RULES: "Which of these is an exception to [common rule]?"
3. COMBINED KNOWLEDGE: "In what year did [Event A] occur, which directly led to [Event B]?"
4. NUANCED DIFFERENCES: "What distinguishes [Concept A] from [Concept B]?" (with a specific distinguishing factor as answer)
5. LESSER-KNOWN FACTS: Test obscure but important details from the material
6. PRECISE TERMINOLOGY: "What is the scientific term for [common description]?"

Example GOOD Hard Questions:
* "What specific enzyme initiates the first step of glycolysis?" (not "Explain glycolysis")
* "In what exact year did Norway gain independence from Sweden?" (not "Analyze Norwegian independence")
* "What is the precise formula for calculating gravitational potential energy?" (not "Evaluate gravity")
* "Which element has the highest electronegativity?" (specific answer: Fluorine)

DISTRACTORS FOR HARD MODE:
- Must be EXTREMELY plausible - things students commonly confuse
- Should include common wrong answers students actually give
- All options should be the same format and similar length`;
  } else {
    // Medium
    difficultyInstructions = `⚠️ DIFFICULTY LEVEL: MEDIUM (STRICTLY STANDARD APPLICATION)
CRITICAL REQUIREMENTS FOR MEDIUM MODE:
- Questions: Use "How", "Explain", "Apply", "Describe" (but NOT "Analyze", "Evaluate", or "Calculate")
- Content: Understanding and application of concepts (not just recall, not deep analysis)
- AVOID "Calculate" unless it's actually a math/science calculation problem with numbers
- For literature/history content, use "What distance...", "How far...", "When did..." instead of "Calculate"
- Require understanding HOW things work, not just WHAT they are
- Example Medium Questions:
  * "How does photosynthesis produce oxygen?"
  * "Explain the main causes of the French Revolution"
  * "What distance does the protagonist travel in the story?"
- Distractors: Common student misconceptions from the same topic`;
  }

  // Build Math Mode instructions
  let mathInstructions = "";
  if (includeMath || subject?.toLowerCase().includes("math") || subject?.toLowerCase().includes("matte")) {
    mathInstructions = `🔥🔥🔥 MATH PROBLEM MODE - CRITICAL REQUIREMENTS 🔥🔥🔥

ABSOLUTE RULES (NO EXCEPTIONS):
1. EVERY question MUST be a SOLVABLE CALCULATION PROBLEM with a SPECIFIC NUMERICAL ANSWER
2. FORBIDDEN WORDS: "Analyze", "Evaluate", "Explain", "Describe", "Discuss", "Why", "How does"
3. REQUIRED FORMAT: "Calculate...", "Solve...", "Find...", "What is the value of..."

EXAMPLES OF CORRECT MATH PROBLEMS:
✅ "Calculate: (-3/4) + (2/5)"
✅ "Solve for x: 2x + 5 = 13"
✅ "What is 15% of 80?"
✅ "Find the area of a triangle with base 8 cm and height 5 cm"
✅ "Simplify: (3x² - 2x + 1) + (x² + 4x - 3)"

EXAMPLES OF FORBIDDEN (NOT MATH PROBLEMS):
❌ "Analyze how negative numbers affect fraction calculations" (This is analysis, not a problem!)
❌ "Explain the process of multiplying fractions" (This is explanation, not a problem!)
❌ "Why do negative numbers work differently in multiplication?" (This is theory, not a problem!)
❌ "How does the Pythagorean theorem apply?" (This is conceptual, not a problem!)

YOUR QUESTIONS MUST:
- Have specific numbers to calculate
- Require step-by-step computation
- Produce a single, definite numerical or algebraic answer
- Be solvable with pen and paper in 1-3 minutes

DISTRACTORS:
- Must be WRONG ANSWERS from common calculation mistakes
- Example: If correct answer is "5/12", distractors could be "7/12" (addition error), "5/9" (wrong denominator), "1/12" (subtraction instead)
- All options must be in the SAME FORMAT as the correct answer

REMEMBER: If you write a question starting with "Analyze", "Evaluate", "Explain", or "Why", you have FAILED this task.`;
  }

  // Build Language Learning Mode instructions
  let languageInstructions = "";
  if (knownLanguage && learningLanguage) {
    languageInstructions = `
⚠️ VOCABULARY MODE ACTIVE - PRODUCTION FOCUS ⚠️
Language pair: Learning ${learningLanguage} from ${knownLanguage}
Parse input flexibly: "[word] - [word]" OR "[word] → [word]" OR "[word]-[word]" (hyphens, arrows, or dashes)
Create ONE flashcard per vocabulary pair.
Question: Ask in ${knownLanguage} how to say/translate the ${knownLanguage} word into ${learningLanguage}.
Answer: The ${learningLanguage} word/phrase (what the user is LEARNING to produce).
Distractors: 3 other ${learningLanguage} words that could be plausible but wrong translations.
`;
  }

  const systemPrompt = knownLanguage && learningLanguage 
    ? `You are creating ${bufferedCount} vocabulary flashcards for ACTIVELY LEARNING ${learningLanguage}.

🎯 LEARNING PHILOSOPHY: The user wants to PRODUCE ${learningLanguage}, not just recognize it.
- Questions show the ${knownLanguage} word and ask "How do you say this in ${learningLanguage}?"
- Answers are in ${learningLanguage} - the language the user is LEARNING
- This tests RECALL and PRODUCTION, which is how you actually learn a language!

STRICT REQUIREMENTS:
1. Input format is FLEXIBLE - accept any separator: "-", "→", "–", "—", ">" between word pairs
2. Generate ONE flashcard PER vocabulary pair
3. QUESTION: Written in ${knownLanguage}, showing the ${knownLanguage} word and asking how to say it in ${learningLanguage}
4. ANSWER: The ${learningLanguage} word/phrase - this is what the user must learn to produce!
5. DISTRACTORS: 3 other ${learningLanguage} words that could be confused with the correct answer

QUESTION FORMAT (ask in ${knownLanguage} for ${learningLanguage} translation):
- English asking for French: "How do you say 'family' in French?"
- English asking for Spanish: "What is 'house' in Spanish?"
- Spanish asking for English: "¿Cómo se dice 'casa' en inglés?"
- French asking for German: "Comment dit-on 'maison' en allemand?"
- Swedish asking for Spanish: "Hur säger man 'hund' på spanska?"
- Norwegian asking for French: "Hvordan sier man 'hund' på fransk?"
- German asking for Italian: "Wie sagt man 'Haus' auf Italienisch?"
- Japanese asking for English: "「家」は英語で何と言いますか？"
- Korean asking for Japanese: "'집'을 일본어로 어떻게 말하나요?"

EXAMPLE - Learning French from English:
Input: "une famille - a family"
Output:
{
  "id": "1",
  "question": "How do you say 'family' in French?",
  "answer": "une famille",
  "distractors": ["une maison", "un ami", "un livre"]
}

EXAMPLE - Learning English from Spanish:
Input: "dog - perro"
Output:
{
  "id": "1",
  "question": "¿Cómo se dice 'perro' en inglés?",
  "answer": "dog",
  "distractors": ["cat", "house", "car"]
}

OUTPUT FORMAT (JSON only):
{"flashcards": [{"id": "1", "question": "...", "answer": "...", "distractors": ["...", "...", "..."]}]}

⚠️ CRITICAL: Generate EXACTLY ${bufferedCount} flashcards total! ⚠️
⚠️ If input has fewer vocabulary pairs than ${bufferedCount}, DO BOTH:
   1. FORWARD cards: "${knownLanguage} → ${learningLanguage}" (asking user to translate TO ${learningLanguage})
   2. REVERSE cards: "${learningLanguage} → ${knownLanguage}" (asking user to translate FROM ${learningLanguage})
   This means each word pair can generate 2 flashcards to reach the target count!
⚠️ For FORWARD cards: Question in ${knownLanguage}, Answer in ${learningLanguage}
⚠️ For REVERSE cards: Question in ${learningLanguage}, Answer in ${knownLanguage}
⚠️ DISTRACTORS must match the answer language ⚠️`
    : `You are an expert academic tutor${subject ? ` in ${subject}` : ""} creating educational flashcards.

CRITICAL: You are creating STUDY FLASHCARDS, not code. Do NOT generate programming code, HTML, or any file modifications.

Your job is to create "learning-rich" flashcard content that helps students study effectively.

CORE RULES:
1. OUTPUT: Valid JSON only with flashcards. No markdown. No code.
2. QUANTITY: Generate exactly ${bufferedCount} flashcards.
3. LANGUAGE: ${outputLanguage === 'auto' ? (language && language !== 'Unknown' ? `Strictly output in ${language}` : 'Same language as the input text') : 'Strictly output in English'}.

${difficultyInstructions}

${mathInstructions}

${materialInstructions}

LEARNING QUALITY (High Priority):
- QUESTIONS should be challenging ("Why", "How", "Analyze") but direct.
- ANSWERS must be BRIEF, PRECISE, and HIGH-IMPACT. Max 15-20 words preferred.
- CUT ALL FLUFF. No "The answer is...", no "Because...", no repetition.
- If the input is simple notes, ensure the question tests understanding, not just recall.

CRITICAL: ANSWER LENGTH MATCHING (HIGHEST PRIORITY)
- ALL 4 OPTIONS MUST BE THE EXACT SAME LENGTH (within 3-5 words of each other).
- Count the words in your correct answer. Each distractor MUST have the same word count ±2.
- If the correct answer is 8 words, ALL distractors must be 6-10 words.
- NEVER make the correct answer longer than distractors - students will guess it.
- Target: 5-12 words per answer. If you need more detail, split into two flashcards.

DISTRACTOR QUALITY (CRITICAL):
- Distractors must be PLAUSIBLE and could genuinely confuse someone who hasn't studied.
- Use REAL concepts from the same topic that sound correct but aren't the right answer.
- If the answer is a date, ALL distractors must be dates from the same era.
- If the answer is a name, ALL distractors must be similar names from the same field.
- If the answer is a definition, ALL distractors must be definitions of RELATED concepts.
- Distractors must represent "close calls" that a student might actually confuse.
- AVOID obviously wrong answers that no student would ever pick.

DISTRACTOR EXAMPLES (Optimized):
Question: "What is the primary function of mitochondria?"
- ✅ "Generates ATP energy for the cell" (Correct, Short)
- ✅ "Synthesizes proteins for structure" (Similar length/style)
- ✅ "Regulates DNA replication cycles" (Similar length/style)
- ✅ "Breaks down cellular waste" (Similar length/style)

REQUIRED JSON OUTPUT FORMAT:
{
  "flashcards": [
    {
      "id": "1",
      "question": "Study question here",
      "answer": "Correct answer here",
      "distractors": ["wrong answer 1", "wrong answer 2", "wrong answer 3"]
    }
  ]
}

Generate ${bufferedCount} educational flashcards now. Output ONLY the JSON above.`;

  try {
    console.log("[API /generate] Starting OpenAI request...");
    const startTime = Date.now();
    
    // Extended timeout - allow full duration for processing
    const timeoutMs = 300000; // 5 minutes max (matching Vercel maxDuration)
    console.log(`[API /generate] Timeout set to ${timeoutMs}ms for ${numberOfFlashcards} cards`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Generation timeout - please try again with fewer cards or shorter text")), timeoutMs);
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
    console.log("[API /generate] RAW AI CONTENT:", content); // TEMPORARY DEBUG

    // Parse response
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log("[API /generate] ✅ Parsed JSON structure:", Object.keys(parsed));
      console.log("[API /generate] Number of flashcards in response:", Array.isArray(parsed) ? parsed.length : (parsed.flashcards?.length || parsed.cards?.length || 0)); // TEMPORARY DEBUG
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
    let flashcards = Array.isArray(parsed) 
      ? parsed 
      : parsed.flashcards || parsed.cards || parsed.items || [];

    // CRITICAL: Detect when AI returned wrong content type (e.g., code instead of flashcards)
    // Check for common "wrong output" patterns
    if (parsed.modified_file_path || parsed.updated_code || parsed.code || parsed.file_path) {
      console.error("[API /generate] ❌ AI returned code/file content instead of flashcards. Retrying is recommended.");
      throw new Error("AI_GENERATION_FAILED");
    }
    
    // If we got an array, verify the first item looks like a flashcard
    if (Array.isArray(flashcards) && flashcards.length > 0) {
      const firstItem = flashcards[0];
      const hasFlashcardStructure = firstItem.question || firstItem.front || firstItem.answer || firstItem.back;
      if (!hasFlashcardStructure) {
        console.error("[API /generate] ❌ Array items don't look like flashcards:", Object.keys(firstItem));
        throw new Error("AI_GENERATION_FAILED");
      }
    }

    if (!Array.isArray(flashcards)) {
      console.error("[API /generate] Response is not an array. Parsed:", JSON.stringify(parsed).slice(0, 200));
      throw new Error("AI_GENERATION_FAILED");
    }
    
    if (flashcards.length === 0) {
      console.error("[API /generate] Empty flashcards array. Keys in response:", Object.keys(parsed));
      throw new Error("AI_EMPTY_RESPONSE");
    }
    
    console.log("[API /generate] Successfully extracted", flashcards.length, "flashcards");

    // Validate and ensure each flashcard has required fields and meets quality standards
    const validatedCards = flashcards
      .map((card: any, index: number) => {
        const question = card.question || card.front || "";
        const answer = card.answer || card.back || "";
        const distractors = card.distractors || [];

        // RELAXED validation for language mode - vocabulary cards have short answers
        if (knownLanguage && learningLanguage) {
          if (!question || question.length < 5) {
            console.warn(`[API /generate] Language card ${index + 1} rejected: question too short: "${question}"`);
            return null;
          }
          if (!answer || answer.length < 2) {
            console.warn(`[API /generate] Language card ${index + 1} rejected: answer too short: "${answer}"`);
            return null;
          }
          // Skip other validations for vocabulary cards
          return {
            id: card.id || `${Date.now()}-${index}`,
            question,
            answer,
            distractors,
          };
        }

        // Standard validation for non-language cards
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
    
    // Provide user-friendly error messages
    if (error.message === "AI_GENERATION_FAILED" || error.message === "AI_EMPTY_RESPONSE") {
      throw new Error("AI_GENERATION_FAILED");
    }
    if (error.message?.includes("timeout") || error.message?.includes("Request timeout") || error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new Error("AI_TIMEOUT");
    }
    if (error.message?.includes("ECONNREFUSED") || error.message?.includes("ENOTFOUND") || error.message?.includes("Connection error")) {
      throw new Error("AI_CONNECTION_ERROR");
    }
    if (error.message?.includes("429") || error.status === 429) {
      throw new Error("AI_RATE_LIMITED");
    }
    if (error.message?.includes("401") || error.status === 401) {
      throw new Error("AI_AUTH_ERROR");
    }
    if (error.message?.includes("500") || error.message?.includes("503") || error.status === 500 || error.status === 503) {
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }
    if (error.message?.includes("parse") || error.message?.includes("JSON")) {
      throw new Error("AI_PARSE_ERROR");
    }
    
    // Generic fallback
    throw new Error("AI_GENERATION_FAILED");
  }
}

/**
 * POST Handler - Central AI Gateway
 */
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { userId, text, numberOfFlashcards, subject, targetGrade, difficulty, language: detectedLanguage, materialType, outputLanguage, knownLanguage, learningLanguage } = body;

    console.log("[API /generate POST] ========== NEW REQUEST ==========");
    console.log("[API /generate POST] numberOfFlashcards requested:", numberOfFlashcards);
    console.log("[API /generate POST] subject:", subject);
    console.log("[API /generate POST] knownLanguage:", knownLanguage);
    console.log("[API /generate POST] learningLanguage:", learningLanguage);
    console.log("[API /generate POST] text length:", text?.length);
    console.log("[API /generate POST] text preview:", text?.substring(0, 200));
    console.log("[API /generate POST] =====================================");

    // Determine the actual output language
    // If outputLanguage is "en", force English; if "auto", use the detected language from input text
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
      materialType,
      outputLanguage,
      difficulty,
      body.includeMath,
      knownLanguage,
      learningLanguage
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
