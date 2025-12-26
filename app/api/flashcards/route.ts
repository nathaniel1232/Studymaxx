import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabase";
import { canUseAI, validateFlashcardCount, FREE_LIMITS } from "@/app/utils/premium";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  distractors?: string[];
}

// Detect the primary language of the text
function detectLanguage(text: string): string {
  const sample = text.slice(0, 500).toLowerCase();
  
  // Norwegian indicators
  const norwegianWords = ['og', 'er', 'det', 'på', 'til', 'med', 'som', 'for', 'av', 'en', 'å', 'ikke', 'har', 'skal', 'kan', 'være', 'fra', 'deg', 'målet', 'læringsmål', 'oversikt', 'eksamen'];
  const norwegianChars = ['æ', 'ø', 'å'];
  
  // Spanish indicators
  const spanishWords = ['el', 'la', 'los', 'las', 'de', 'que', 'es', 'en', 'un', 'una', 'por', 'para', 'con', 'está', 'qué'];
  const spanishChars = ['ñ', 'á', 'é', 'í', 'ó', 'ú', '¿', '¡'];
  
  // French indicators
  const frenchWords = ['le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'dans', 'pour', 'qui', 'que', 'sur', 'avec', 'ce'];
  const frenchChars = ['é', 'è', 'ê', 'à', 'ù', 'ç', 'œ'];
  
  // German indicators
  const germanWords = ['der', 'die', 'das', 'und', 'ist', 'in', 'den', 'von', 'zu', 'mit', 'ein', 'eine', 'auf', 'für', 'sich'];
  const germanChars = ['ä', 'ö', 'ü', 'ß'];
  
  let norwegianScore = 0;
  let spanishScore = 0;
  let frenchScore = 0;
  let germanScore = 0;
  let englishScore = 0;
  
  // Check for characteristic words
  norwegianWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    norwegianScore += (sample.match(regex) || []).length;
  });
  
  spanishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    spanishScore += (sample.match(regex) || []).length;
  });
  
  frenchWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    frenchScore += (sample.match(regex) || []).length;
  });
  
  germanWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    germanScore += (sample.match(regex) || []).length;
  });
  
  // Check for characteristic characters (weighted more heavily)
  norwegianChars.forEach(char => {
    norwegianScore += (sample.split(char).length - 1) * 3;
  });
  
  spanishChars.forEach(char => {
    spanishScore += (sample.split(char).length - 1) * 3;
  });
  
  frenchChars.forEach(char => {
    frenchScore += (sample.split(char).length - 1) * 2;
  });
  
  germanChars.forEach(char => {
    germanScore += (sample.split(char).length - 1) * 3;
  });
  
  // English words (common English words not in other languages)
  const englishWords = ['the', 'is', 'are', 'was', 'were', 'this', 'that', 'what', 'which', 'have', 'has', 'been', 'their', 'would', 'should'];
  englishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    englishScore += (sample.match(regex) || []).length;
  });
  
  // Determine the dominant language
  const scores = [
    { lang: 'Norwegian', score: norwegianScore },
    { lang: 'Spanish', score: spanishScore },
    { lang: 'French', score: frenchScore },
    { lang: 'German', score: germanScore },
    { lang: 'English', score: englishScore }
  ];
  
  scores.sort((a, b) => b.score - a.score);
  
  // Default to English if no clear winner
  return scores[0].score > 3 ? scores[0].lang : 'English';
}

// Detect if the input is learning objectives/overview vs factual notes
function detectInputType(text: string): 'objectives' | 'notes' {
  const lowerText = text.toLowerCase();
  
  // Keywords that indicate learning objectives/overview
  const objectiveIndicators = [
    'læringsmål', 'målark', 'oversikt', 'eksamen',
    'learning objective', 'learning goal', 'you should know',
    'you will learn', 'after this', 'by the end',
    'students should', 'objectives:', 'goals:',
    'understand how', 'be able to', 'explain why',
    'describe the', 'demonstrate'
  ];
  
  // Check structure: lots of bullet points or short lines
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const bulletPoints = text.match(/^[\s]*[-•*]|^[\s]*\d+\./gm);
  const bulletRatio = bulletPoints ? bulletPoints.length / lines.length : 0;
  
  // Check for objective keywords
  const hasObjectiveKeywords = objectiveIndicators.some(keyword => 
    lowerText.includes(keyword)
  );
  
  // If high bullet ratio OR objective keywords, it's likely objectives
  if (bulletRatio > 0.4 || hasObjectiveKeywords) {
    return 'objectives';
  }
  
  return 'notes';
}

// Detect if the subject is a language subject
function detectSubjectType(text: string): 'language' | 'other' {
  const lowerText = text.toLowerCase();
  
  // Keywords that indicate language learning
  const languageIndicators = [
    // Grammar topics
    'grammar', 'grammatikk', 'tense', 'tempus', 'verb', 'noun', 'adjective',
    'pronoun', 'preposition', 'adverb', 'syntax', 'sentence structure',
    'present tense', 'past tense', 'future tense', 'perfect tense',
    'modal verb', 'auxiliary verb', 'subject-verb agreement',
    
    // Language skills
    'reading comprehension', 'writing', 'speaking', 'listening',
    'vocabulary', 'ordforråd', 'spelling', 'pronunciation', 'uttale',
    'punctuation', 'comma', 'period', 'semicolon',
    
    // English-specific
    'articles', 'a/an/the', 'phrasal verb', 'idiom', 'word order',
    'passive voice', 'active voice', 'indirect speech', 'reported speech',
    
    // Norwegian/other languages
    'presens', 'preteritum', 'perfektum', 'substantiv', 'adjektiv',
    
    // General language learning
    'translate', 'translation', 'oversett', 'correct the sentence',
    'fill in the blank', 'choose the correct', 'rewrite', 'conjugate'
  ];
  
  // Count matches
  let matchCount = 0;
  languageIndicators.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  });
  
  // If 3 or more language indicators, it's likely a language subject
  return matchCount >= 3 ? 'language' : 'other';
}

// Detect if the subject is mathematics
function detectMathSubject(text: string, subject?: string): boolean {
  // Check explicit subject first
  if (subject) {
    const mathSubjects = ['math', 'maths', 'mathematics', 'matematikk', 'algebra', 'geometry', 'geometri', 'calculus', 'kalkulus', 'trigonometry', 'trigonometri'];
    if (mathSubjects.some(s => subject.toLowerCase().includes(s))) {
      return true;
    }
  }
  
  const lowerText = text.toLowerCase();
  
  // Math keywords and patterns
  const mathIndicators = [
    // Math topics
    'equation', 'likning', 'formula', 'formel', 'solve', 'løs', 'calculate', 'regn ut',
    'derivative', 'derivert', 'integral', 'function', 'funksjon',
    'polynomial', 'polynom', 'quadratic', 'andregrads',
    'trigonometry', 'trigonometri', 'sine', 'cosine', 'tangent', 'sinus', 'cosinus',
    'theorem', 'teorem', 'proof', 'bevis',
    'matrix', 'matrise', 'vector', 'vektor',
    
    // Math operations
    'multiply', 'gange', 'divide', 'dele', 'subtract', 'subtrahere', 'add', 'legge til',
    'square root', 'kvadratrot', 'exponent', 'eksponent', 'logarithm', 'logaritme',
    
    // Math symbols in text
    'x =', 'y =', 'f(x)', 'solve for', 'find x', 'finn x',
    '2x', '3x', 'x²', 'x^2'
  ];
  
  // Math symbol patterns
  const mathPatterns = [
    /\d+x[\+\-\*/]/gi,  // 2x+, 3x-, etc.
    /x[\+\-\*/]\d+/gi,  // x+5, x-3, etc.
    /=\s*\d+/gi,        // = 5, = 10, etc.
    /\d+\s*[\+\-\*/]\s*\d+/gi, // 2+3, 5*7, etc.
    /solve|løs|calculate|regn\s+ut/gi
  ];
  
  let matchCount = 0;
  
  // Check keywords
  mathIndicators.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  });
  
  // Check patterns
  mathPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      matchCount += 2; // Patterns count double
    }
  });
  
  // If 4 or more indicators/patterns, it's likely math
  return matchCount >= 4;
}

// Increase timeout for this API route (Vercel/production: max 60s on hobby plan)
export const maxDuration = 60; // seconds

export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      numberOfFlashcards = 7, 
      difficulty = "Medium",
      subject = "",
      targetGrade = "",
      userId
    } = await request.json();

    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: "Please provide at least 20 characters of text" },
        { status: 400 }
      );
    }

    // Check premium status and enforce limits
    let isPremium = false;
    let userPlan = {
      isPremium: false,
      setsCreated: 0,
      lastResetDate: new Date().toISOString(),
    };

    if (userId && supabase) {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_premium, sets_created, last_reset_date')
          .eq('id', userId)
          .single();

        if (!error && userData) {
          isPremium = userData.is_premium || false;
          userPlan = {
            isPremium,
            setsCreated: userData.sets_created || 0,
            lastResetDate: userData.last_reset_date || new Date().toISOString(),
          };
        }
      } catch (error) {
        console.error('Failed to fetch user premium status:', error);
      }
    }

    // Check if user can use AI
    const aiCheck = canUseAI(userPlan);
    if (!aiCheck.allowed) {
      return NextResponse.json(
        { 
          error: aiCheck.reason,
          premiumRequired: true,
          limitType: 'ai_generation'
        },
        { status: 403 }
      );
    }

    // Validate flashcard count for free users
    const countCheck = validateFlashcardCount(numberOfFlashcards, isPremium);
    if (!countCheck.valid) {
      return NextResponse.json(
        { 
          error: countCheck.reason,
          premiumRequired: true,
          limitType: 'flashcard_count',
          maxAllowed: FREE_LIMITS.maxFlashcardsPerSet
        },
        { status: 403 }
      );
    }

    // Detect language, input type, and subject type
    const detectedLanguage = detectLanguage(text);
    const inputType = detectInputType(text);
    const subjectType = detectSubjectType(text);
    const isMathSubject = detectMathSubject(text, subject);
    
    // Calculate content density to guide AI
    const wordCount = text.trim().split(/\s+/).length;
    const naturalCardCount = Math.min(Math.floor(wordCount / 30), numberOfFlashcards);
    const needsExpansion = numberOfFlashcards > naturalCardCount && wordCount < 200;
    
    // For learning objectives, limit to max 15 cards to avoid truncation
    const adjustedCardCount = inputType === 'objectives' && numberOfFlashcards > 15 
      ? 15 
      : numberOfFlashcards;

    let completion;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );
      
      const completionPromise = openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 4096,
          messages: [
        {
          role: "system",
          content: `You are an expert at creating effective study flashcards from learning materials.

YOUR JOB: Extract learnable facts and create useful study questions.

🌍 CRITICAL LANGUAGE RULE (HIGHEST PRIORITY):
ALWAYS generate flashcards in the SAME LANGUAGE as the input material.
- Input in Norwegian → ALL flashcards MUST be in Norwegian
- Input in Spanish → ALL flashcards MUST be in Spanish  
- Input in French → ALL flashcards MUST be in French
- Input in English → ALL flashcards MUST be in English
- NEVER translate unless explicitly asked
- Mixed-language input: use the dominant language
- This applies to questions, answers, AND distractors

CRITICAL RULES:
1. NEVER create a flashcard that asks to "summarize the text" or "oppsummer teksten"
2. Each flashcard must be independently learnable
3. Extract facts explicitly stated in the material OR teach concepts mentioned in learning objectives
4. Questions must have clear, specific answers
5. Do NOT add unrelated information
6. Avoid repetitive or nearly-identical questions
7. Flashcards must be USEFUL for test preparation

📋 LEARNING OBJECTIVES / OVERVIEW INPUT:
If the input is a list of learning objectives or chapter overview:
- The input describes WHAT to know, not HOW or explanations
- Your job: CREATE FLASHCARDS that test the knowledge mentioned
- DO NOT reference page numbers or "skip" instructions
- Use your knowledge to create appropriate factual questions

EXAMPLES OF PROPER FLASHCARD GENERATION:

Input: "5.1: Den genetiske koden: Celledeling - forskjellen på mitose og meiose"
✓ CORRECT flashcards:
  - Q: "Hva er mitose?" A: "Celledeling som gir to identiske celler"
  - Q: "Hva er meiose?" A: "Celledeling som gir fire kjønnsceller med halvparten av kromosomene"
  - Q: "Hva er forskjellen på mitose og meiose?" A: "Mitose gir identiske celler, meiose gir kjønnsceller med halvert kromosomsett"
❌ WRONG:
  - Q: "Hva står i kapittel 5.1?" (references textbook)
  - Q: "Hva skal du kunne om celledeling?" (meta-question)
  - Q: "Gi et eksempel på celledeling: Mitose" (wrong format)

Input: "Kraft og bevegelse - tyngdekraft, friksjon, luftmotstand"
✓ CORRECT flashcards:
  - Q: "Hva er en kraft?" A: "En påvirkning som kan endre bevegelsen eller formen til et objekt"
  - Q: "Hva er tyngdekraft?" A: "Kraften som trekker objekter mot jordoverflaten"
  - Q: "Hva er et eksempel på en kraft?" A: "Tyngdekraft"
  - Q: "Nevn en vanlig type friksjon" A: "Glidefriksjon"
  - Q: "Hva er forskjellen på friksjon og luftmotstand?" A: "Friksjon virker mellom faste overflater, luftmotstand virker i luft"
❌ WRONG:
  - Q: "Gi et eksempel på en type kraft: Tyngdekraft" (wrong format)
  - Q: "Hva betyr det å forstå kraft?" (meta-question)
  - Q: "En type kraft er tyngdekraft" (not a question)

Input: "Fotosyntese - prosessen, reaktanter og produkter"
✓ CORRECT flashcards:
  - Q: "Hva er fotosyntese?" A: "Prosessen der planter omdanner lys, vann og CO₂ til glukose og oksygen"
  - Q: "Hva er reaktantene i fotosyntese?" A: "Karbondioksid, vann og lys"
  - Q: "Hva er produktene i fotosyntese?" A: "Glukose og oksygen"
  - Q: "Hva er et eksempel på fotosyntese?" A: "Planter som lager mat fra sollys"
❌ WRONG:
  - Q: "Hva skal du kunne om fotosyntese?" (meta-question)
  - Q: "Forklar fotosyntese" (too vague)

Input: "Du kan hoppe over Photo 51 s. 225"
✓ CORRECT: Ignore this and create flashcards for other topics
❌ WRONG: Trying to create flashcards about page 225

SUBJECT-SPECIFIC BEHAVIOR:

� MATHEMATICS SUBJECTS (Algebra, Geometry, Calculus, etc.):
When the content is about mathematics:

ALWAYS GENERATE:
✓ Actual calculation problems that require solving
✓ Problems that mimic real exam questions
✓ Clear problem statements with numerical answers

FORMAT FOR MATH PROBLEMS (NO DISTRACTORS):
Question: "Solve: 3x + 5 = 20"
Answer: "x = 5"
Distractors: []

Question: "Calculate: 15% of 240"
Answer: "36"
Distractors: []

CRITICAL: Leave distractors array EMPTY for math problems!
Students will solve with pen/paper and self-assess their answer.

DO NOT GENERATE FOR MATH:
❌ "What is algebra?"
❌ "Define derivative"
❌ "What is the purpose of calculus?"

INSTEAD:
✓ "Solve: 2x² - 8 = 0"
✓ "Find the derivative of f(x) = 3x² + 2x"
✓ "Calculate the area of a circle with radius 5"

Math problems should:
- Require actual computation
- Have specific numerical or algebraic answers
- Leave distractors array EMPTY (students solve with pen/paper and self-assess)

�🔤 LANGUAGE SUBJECTS (English, Norwegian grammar, etc.):
When the content is about language learning, grammar, or language skills:

DO NOT GENERATE:
❌ "What is reading comprehension?"
❌ "What is the purpose of grammar?"
❌ "Define present tense"
❌ Long explanatory answers

INSTEAD GENERATE:
✓ Fill in the blank exercises
✓ Sentence correction tasks
✓ Tense identification
✓ Word order practice
✓ Single word/phrase translations
✓ Short sentence writing prompts

PREFERRED FORMATS FOR LANGUAGE SUBJECTS:
✓ "Choose the correct tense: I ___ (go) to school yesterday."
✓ "Correct this sentence: She don't like apples."
✓ "Put these words in order: school / goes / she / to"
✓ "Identify the tense: 'I have been waiting for an hour.'"
✓ "Complete: If I ___ (know), I would tell you."
✓ "Translate: 'apple'" (single word only)
✓ "Write one sentence using 'however'"

When input is learning objectives for language subjects:
- DO NOT turn "Use present and past tense" into "What is present tense?"
- INSTEAD create: Tense identification exercises, sentence correction, sentence creation

📚 OTHER SUBJECTS (Science, History, Math, etc.):
Use traditional fact-based questions:
✓ "What is photosynthesis?"
✓ "Who discovered penicillin?"
✓ "What caused World War I?"

DIFFICULTY LEVELS:
- Easy → For language subjects: Single word answers, simple corrections, or fill-in-blank with 1 word. For other subjects: 1-2 word answers, basic facts.
- Medium → For language subjects: Short sentence corrections or completions. For other subjects: 1-2 sentence explanations.
- Hard → For language subjects: Multi-step exercises, mixed skills, or paragraph writing. For other subjects: Deep "why/how" questions, applications, comparisons.

INPUT TYPE HANDLING:

A) FACTUAL NOTES / DEFINITIONS:
- Extract key facts and concepts directly from the text
- Create questions testing understanding of what's written
- Base answers on explicit information provided
- For language subjects: Focus on examples and usage patterns in the notes

B) LEARNING OBJECTIVES / EXAM OVERVIEW:
- Input contains: bullet points, "you should know", "læringsmål", "målark", "oversikt", "eksamen"
- CRITICAL: The input describes WHAT students should KNOW, not explanations
- Your job: DERIVE good flashcards based on those goals

🎯 FLASHCARD TYPES TO GENERATE:

A) DEFINITION CARDS (Most important)
Format: "Hva er [term]?" / "What is [term]?"
Answer: Short, precise, 1 sentence
Example:
  Q: "Hva er en kraft?"
  A: "En påvirkning som kan endre bevegelsen eller formen til et objekt"

B) EXAMPLE CARDS
❌ NEVER use: "Gi et eksempel på..."
✓ Instead use:
  - "Hva er et eksempel på en kraft?"
  - "Nevn en vanlig type kraft"
Answer: Correct term, properly spelled
Example:
  Q: "Hva er et eksempel på en kraft?"
  A: "Tyngdekraft"

C) COMPARISON CARDS (when text mentions differences)
Format: "Hva er forskjellen på [A] og [B]?"
Example:
  Q: "Hva er forskjellen på masse og vekt?"
  A: "Masse er hvor mye stoff et objekt inneholder, mens vekt er kraften tyngdekraften virker med på objektet"

D) FORMULA CARDS (math/physics)
When formulas are mentioned: create separate cards
Example:
  Q: "Hvordan regner du ut fart?"
  A: "Fart = strekning / tid"
Or:
  Q: "Hvilken formel brukes for å regne ut fart?"
  A: "v = s / t"

E) KEY TERM CARDS
If text contains technical terms (kraft, friksjon, energi, spenning, motstand):
Create individual "Hva er...?" cards for each

🚫 NEVER CREATE:
❌ "Hva betyr det å forklare..."
❌ "Hva menes med at du skal kunne..."
❌ "Gi et eksempel på [term]: [Answer]" (wrong format)
❌ Meta-questions about the learning objective itself

✅ ALWAYS FOCUS ON:
✓ Actual subject knowledge
✓ Natural, textbook-like questions
✓ Proper Norwegian (no "en type ... er ..."-formulations)
✓ Questions that sound natural when spoken aloud

DIFFICULTY ADAPTATION:
- High grades (A/B): More explanation cards, full sentences, include connections
- Lower grades (C/D/E): Shorter answers, fewer details, focus on essentials

QUALITY STANDARDS (CRITICAL):
- Flashcards must be pedagogically sound
- Language must be natural and correct
- Questions should feel like they came from a teacher
- Usable directly for studying
- Comparable to Quizlet and Gizmo quality

For non-language subjects:
  Input: "Understand photosynthesis"
  ✓ GOOD: Q: "What is photosynthesis?" A: "The process by which plants convert light into energy"
  ✓ GOOD: Q: "What is an example of photosynthesis?" A: "Plants making food from sunlight"
  ❌ BAD: Q: "What should you understand?" A: "Photosynthesis"
  ❌ BAD: Q: "Gi et eksempel på fotosyntese" (wrong format)

For language subjects:
  Input: "Use present and past tense correctly"
  ✓ GOOD: Q: "Choose correct tense: Yesterday I ___ (go) to the store." A: "went"
  ❌ BAD: Q: "What is past tense?" A: "A verb form referring to the past"

CONTENT GUIDELINES:
- If material is brief, focus on quality over quantity
- If requested cards exceed natural content, intelligently expand with:
  * Related conceptual questions
  * Clarifying questions about key terms
  * Application questions
  * Comparison questions
- All expansions must stay factual and on-topic

PREFERRED question formats (adapt to input language):
✓ "Hva er [konsept]?" / "What is [concept]?"
✓ "Hva er et eksempel på [konsept]?" / "What is an example of [concept]?"
✓ "Nevn en vanlig type [konsept]" / "Name a common type of [concept]"
✓ "Hvorfor skjer [ting]?" / "Why does [thing] happen?"
✓ "Hvordan fungerer [prosess]?" / "How does [process] work?"
✓ "Hva er forskjellen mellom [A] og [B]?" / "What is the difference between [A] and [B]?"
✓ "Hvilken formel brukes for [beregning]?" / "Which formula is used for [calculation]?"
✓ "Hvordan regner du ut [verdi]?" / "How do you calculate [value]?"

NEVER DO:
❌ "Gi et eksempel på..." / "Give an example of..." (meta-question format)
❌ "Summarize the text" / "Oppsummer teksten"
❌ "Hva betyr det å..." / "What does it mean to..."
❌ "En type [X] er [Y]" (unnatural phrasing)
❌ Translate the input language (keep everything in original language)
❌ Vague or unanswerable questions
❌ Duplicate questions with different wording
❌ Copy learning objectives as questions
❌ Generic questions like "What should you know?"
❌ Spelling errors or incorrect Norwegian/English

QUIZ MODE DISTRACTORS (CRITICAL - APPLIES TO ALL SUBJECTS):
🎯 CORE RULE: ALL answer options must belong to the SAME SEMANTIC CATEGORY as the correct answer.

⚠️ MANDATORY QUALITY STANDARDS (STRICTLY ENFORCED):
1. SAME TYPE: All options must be the exact same type (places/people/dates/processes/concepts/verb forms)
2. SIMILAR LENGTH: All options MUST be roughly the same character length:
   - Short (1-5 chars): ±1 character maximum
   - Medium (6-20 chars): ±3 characters maximum
   - Long (21-50 chars): ±5 characters maximum
   - Very long (50+ chars): ±20% maximum
3. GRAMMATICALLY PARALLEL: All options MUST use identical grammatical structure
4. CONTEXTUALLY RELEVANT: All distractors MUST be plausible within the subject matter
5. NO OBVIOUS OUTLIERS: No option should "stand out" visually, semantically, or by length
6. SAME ABSTRACTION LEVEL: All options at same specificity (not mixing general and specific)

🚫 ABSOLUTE REQUIREMENTS - THESE ARE NOT SUGGESTIONS:
- If you cannot create 3 high-quality distractors that meet ALL standards above:
  → Create 2 distractors instead of 3
  → OR use only 1 distractor
  → NEVER include bad distractors just to reach 3
- Better to have 2 excellent distractors than 3 with one that's obviously wrong
- The quiz must actually TEST knowledge, not just ask students to eliminate absurd options

COMMON MISTAKES TO AVOID:
❌ Mixing categories: [Oslo, 1814, Mountain, Vikings]
❌ Wildly different lengths: [A, Something very long indeed that goes on and on, B, C]
❌ Grammar mismatches: [Running, To jump, Swam, Eat]
❌ Unrelated distractors: [Photosynthesis, Pizza, Gravity, Democracy]
❌ Obviously wrong options: [Paris, London, Jupiter, Toothbrush]
❌ One answer much longer/shorter: ["went", "go", "was going to school yesterday"]

CORRECT EXAMPLES BY SUBJECT:

🔤 LANGUAGE (NORWEGIAN GRAMMAR):
Q: "Velg riktig tempus: I går ___ jeg til skolen"
✓ GOOD: ["gikk", "går", "hadde gått"] (all verb forms, 3-9 chars, same structure)
❌ BAD: ["gikk", "school", "yesterday", "to walk"] (mixed types)
✓ ALSO GOOD (fewer but better): ["gikk", "går"] (only 2 distractors, but both excellent)

📚 HISTORY/GEOGRAPHY:
Q: "What is the capital of Norway?"
✓ GOOD: ["Oslo", "Bergen", "Trondheim"] (all Norwegian cities, 4-9 chars)
✓ ALSO GOOD: ["Oslo", "Bergen", "Stockholm", "Helsinki"] (all Nordic capitals, 4-9 chars)
❌ BAD: ["Oslo", "The largest city in Scandinavia", "1814", "Mountain"] (mixed types, wildly different lengths)

🔬 SCIENCE:
Q: "Hva er fotosyntese?"
✓ GOOD: ["Planter omdanner lys til energi", "Celler deler seg i to", "Planter tar opp vann"] (all processes, 24-29 chars, parallel structure starting with noun)
❌ BAD: ["Fotosyntese", "En prosess som involverer sollys og gjør at planter kan vokse ved å omdanne karbondioksid til oksygen og glukose", "Klorofyll", "Grønt"] (lengths: 11, 130, 9, 5 chars - unacceptable)

📐 MATHEMATICS:
Q: "Solve: 3x + 5 = 20"
✓ GOOD: ["5", "7", "4"] (all single digits, equal length)
✓ ALSO GOOD: ["x = 5", "x = 7", "x = 4"] (all in same format)
❌ BAD: ["5", "x equals five", "20", "3x"] (mixed formats, different lengths)

LENGTH MATCHING - STRICTLY ENFORCED:
Character count must be within these ranges:
- 1-5 chars: All options ±1 character
- 6-20 chars: All options ±3 characters  
- 21-50 chars: All options ±5 characters
- 50+ chars: All options ±20% (e.g., 50-60 char answer = distractors must be 40-72 chars)

Examples of acceptable length matching:
✓ ["Paris", "London", "Berlin", "Madrid"] (5,6,6,6 chars - GOOD)
✓ ["Fotosyntese", "Respirasjon", "Transpirasjon"] (11,11,14 chars - GOOD)  
✓ ["Prosess der planter lager mat", "Prosess der celler deler seg", "Prosess der planter puster"] (29,28,26 chars - GOOD)
❌ ["Oslo", "Bergen", "Stockholm"] (4,6,9 chars - ACCEPTABLE but not ideal for short words)
❌ ["Paris", "London and its surrounding metropolitan area"] (5,43 chars - UNACCEPTABLE)

GRAMMATICAL PARALLEL STRUCTURE - STRICTLY ENFORCED:
If correct answer is:
- Past tense verb → ALL distractors MUST be past tense verbs
- Noun phrase → ALL distractors MUST be noun phrases  
- Complete sentence → ALL distractors MUST be complete sentences
- Definition starting with "A process..." → ALL distractors MUST start with "A process..."
- Present participle (-ing form) → ALL distractors MUST be present participles
- Infinitive (to + verb) → ALL distractors MUST be infinitives

For EVERY flashcard, include 2-3 high-quality distractor answers.
These must be WRONG but require actual knowledge to distinguish from the correct answer.

⚠️ QUALITY OVER QUANTITY:
- 3 excellent distractors > 2 excellent distractors > 1 excellent distractor > 3 poor distractors
- If you can only create 2 distractors that meet all quality standards, use only 2
- If you can only create 1 distractor that meets all standards, use only 1
- NEVER sacrifice quality to reach a target number

🔤 LANGUAGE SUBJECTS:
Grammar/tense questions:
- All distractors must be from the SAME grammatical category
- Example: "Identify tense: I am studying"
  Correct: "Present continuous"
  Distractors: ["Present simple", "Past continuous", "Present perfect"]

Fill-in-blank:
- Distractors should be common mistake variations
- Example: "Yesterday I ___ (go) to school"
  Correct: "went"
  Distractors: ["go", "goed", "gone"]

📚 GEOGRAPHY / HISTORY:
- All options must be same type (all places, all people, all dates, all events)
- Example: "What is the capital of Norway?"
  Correct: "Oslo"
  Distractors: ["Bergen", "Stockholm", "Copenhagen"]
  NOT: ["Mountain", "1814", "Vikings"]

🔬 SCIENCE:
- All options must be related scientific concepts at similar abstraction level
- Example: "What is photosynthesis?"
  Correct: "Process plants use to convert light into energy"
  Distractors: ["Process of cell division", "Process of respiration", "Process of transpiration"]
  NOT: ["Chloroplast", "Green", "Biology"]

📖 GENERAL FACTS:
- Match the answer format and category exactly
- If answer is a definition → distractors are related definitions
- If answer is a number → distractors are similar numbers
- If answer is a name → distractors are similar names

DIFFICULTY SCALING:
- Easy: 2 plausible related options + 1 slightly obvious but still same category
- Medium: All 3 distractors equally plausible from same category
- Hard: Very closely related alternatives that require deep understanding

RETURN FORMAT:
ALL flashcards (language AND non-language) must include distractors:
{"question": "...", "answer": "...", "distractors": ["wrong1", "wrong2", "wrong3"]}

🔴 CRITICAL OUTPUT FORMAT:
You MUST return ONLY a valid JSON array. Nothing else.
- NO markdown code blocks (no \`\`\`json)
- NO explanatory text before or after
- NO comments
- Just the raw JSON array starting with [ and ending with ]

Example valid output:
[
  {"question": "Hva er fotosyntese?", "answer": "Prosessen der planter omdanner lys til energi", "distractors": ["Celledeling", "Respirasjon", "Transpirasjon"]},
  {"question": "What is the capital of France?", "answer": "Paris", "distractors": ["London", "Berlin", "Madrid"]}
]`,
        },
        {
          role: "user",
          content: `Generate ${adjustedCardCount} flashcards from the following material.

${subject ? `📚 Subject: ${subject}` : ''}
${targetGrade ? `🎯 Target Grade: ${targetGrade} - ${targetGrade === 'A' ? 'Create comprehensive, detailed flashcards covering advanced concepts' : targetGrade === 'B' || targetGrade === 'C' ? 'Create thorough flashcards with good depth' : 'Focus on essential concepts and core knowledge'}` : ''}

Language detected: ${detectedLanguage}
⚠️ Generate ALL flashcards in ${detectedLanguage}. Do NOT translate.

Subject type: ${isMathSubject ? '📐 MATHEMATICS - Generate CALCULATION PROBLEMS that require solving. Include "Show your work" / "Vis utregningen" hints. DO NOT generate definition questions.' : subjectType === 'language' ? '🔤 LANGUAGE SUBJECT - Generate PRACTICE-BASED flashcards (fill-in-blank, corrections, tense identification). DO NOT generate definition questions.' : '📚 NON-LANGUAGE SUBJECT - Use traditional fact-based questions.'}

🎯 CRITICAL: Include "distractors" array with 3 plausible wrong answers that are the SAME CATEGORY/TYPE and SIMILAR LENGTH as the correct answer.

Input type: ${inputType === 'objectives' ? '📋 Learning Objectives/Overview - CREATE flashcards that test the mentioned concepts using your general knowledge. IGNORE page numbers and "skip" instructions. Focus on KEY CONCEPTS listed.' : 'Factual Notes - Extract key facts directly from the provided text'}
${inputType === 'objectives' ? '\n⚠️ IMPORTANT: You are generating only ' + adjustedCardCount + ' flashcards. Make them count by covering the MOST important concepts.\n' : ''}

Difficulty: ${difficulty}
${needsExpansion ? `\nNote: Material is brief. Focus on quality and intelligently expand with related questions if needed.\n` : ''}

Material:
${text}`,
        },
      ],
    });
      
      completion = await Promise.race([completionPromise, timeoutPromise]);
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      
      if (error.message?.includes('timeout')) {
        return NextResponse.json(
          { error: "Request timed out. The material might be too long. Try with shorter text or fewer flashcards." },
          { status: 504 }
        );
      }
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return NextResponse.json(
          { error: "Network error. Please check your internet connection and try again." },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: `API Error: ${error.message || 'Unknown error occurred'}` },
        { status: 500 }
      );
    }

    const raw = completion.choices?.[0]?.message?.content ?? "[]";

    // Try to extract JSON if the model wrapped it
    let jsonText = raw.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    
    // Try to find JSON array
    const match = jsonText.match(/\[[\s\S]*\]/);
    if (match) jsonText = match[0];

    let parsed: Array<{ question: string; answer: string; distractors?: string[] }>;
    try {
      parsed = JSON.parse(jsonText);
      
      // Validate that it's an array
      if (!Array.isArray(parsed)) {
        console.error("Response is not an array:", parsed);
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", raw);
      console.error("Attempted to parse:", jsonText);
      return NextResponse.json(
        { error: "AI returned invalid response. Please try again." },
        { status: 500 }
      );
    }

    const cards: Flashcard[] = parsed
      .filter(c => c?.question && c?.answer && c.question.trim().length > 3 && c.answer.trim().length > 1)
      .map((c, i) => {
        const card: Flashcard = { 
          id: `${Date.now()}-${i}`, 
          question: c.question.trim(), 
          answer: c.answer.trim()
        };
        
        // Include distractors if provided (for language subjects)
        if (c.distractors && Array.isArray(c.distractors) && c.distractors.length > 0) {
          card.distractors = c.distractors.map(d => d.trim()).filter(d => d.length > 0);
        }
        
        return card;
      });

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "Unable to generate flashcards from this text. Try providing more detailed content or rephrasing your input." },
        { status: 422 }
      );
    }

    return NextResponse.json(cards, { status: 200 });
  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    
    // Handle specific error types
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: "Service configuration error. Please contact support." },
        { status: 500 }
      );
    }
    
    if (error?.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate flashcards. Please try again." },
      { status: 500 }
    );
  }
}
