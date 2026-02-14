import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    if (!projectId) throw new Error('VERTEX_AI_PROJECT_ID not configured');
    
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

/**
 * Normalize the "correct" field from the AI response.
 * The AI might return "A", "A)", "a", "Option A", etc.
 * We always want just the uppercase letter: "A", "B", "C", or "D".
 */
function normalizeCorrectAnswer(raw: string): string {
  if (!raw) return 'A';
  const cleaned = raw.trim().toUpperCase();
  // Extract just the letter
  const match = cleaned.match(/^([A-D])/);
  return match ? match[1] : 'A';
}

/**
 * Convert Unicode math symbols and text-based math notation to LaTeX commands.
 * Used by ensureLatexInOption to normalize all math content.
 */
function convertMathSymbols(text: string): string {
  return text
    // Roots
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/(\d+)√(\d+)/g, '$1\\sqrt{$2}')
    .replace(/√(\d+)/g, '\\sqrt{$1}')
    .replace(/√/g, '\\sqrt{}')
    .replace(/∛(\d+)/g, '\\sqrt[3]{$1}')
    .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
    // Fractions
    .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
    // Unicode operators
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/±/g, '\\pm ')
    .replace(/≤/g, '\\leq ')
    .replace(/≥/g, '\\geq ')
    .replace(/≠/g, '\\neq ')
    // Superscripts
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    // Greek and symbols
    .replace(/π/g, '\\pi ')
    .replace(/∞/g, '\\infty ')
    .replace(/θ/g, '\\theta ')
    // Text operators
    .replace(/\*\*/g, '^')
    .replace(/(?<![\\a-zA-Z])\*/g, '\\cdot ');
}

/**
 * Ensure every quiz option has its math content properly wrapped in LaTeX $...$.
 * Handles mixed content like "x = 2 or x = 3" and "4√2 meters" by
 * wrapping only the math parts, leaving text words as plain text.
 */
function ensureLatexInOption(option: string): string {
  const match = option.match(/^([A-D]\)\s*)([\s\S]*)/);
  if (!match) return option;

  const prefix = match[1];
  let content = match[2].trim();

  // If already properly wrapped in $...$, keep it but normalize
  if (/^\$[^$]+\$$/.test(content)) {
    return `${prefix}${content}`;
  }

  // Strip all $ to normalize
  content = content.replace(/\$+/g, '');

  // Check if content has text words mixed with math (like "x = 2 or x = 3" or "4√2 meters")
  // Text words = common English/math words that shouldn't be in LaTeX
  const textWords = /\b(or|and|meters|cm|km|miles|feet|inches|seconds|hours|minutes|degrees|units|square|cubic|none|no solution|undefined|does not exist|impossible|true|false|all real numbers|no real solution)\b/i;
  
  if (textWords.test(content)) {
    // Split on text words, wrap math parts in $, leave text as-is
    const parts = content.split(/((?:\b(?:or|and|meters|cm|km|miles|feet|inches|seconds|hours|minutes|degrees|units|square|cubic|none|no solution|undefined|does not exist|impossible|true|false|all real numbers|no real solution)\b\s*)+)/i);
    
    const result = parts.map((part, i) => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      if (textWords.test(trimmed)) {
        return ` ${trimmed} `;
      }
      // This is a math part — convert symbols and wrap
      return `$${convertMathSymbols(trimmed)}$`;
    }).join('').trim();
    
    return `${prefix}${result}`;
  }

  // Pure math content — convert symbols and wrap entirely
  content = convertMathSymbols(content);
  return `${prefix}$${content}$`;
}

/**
 * Validate and fix quiz structure from AI response.
 * Ensures all required fields exist with proper types.
 */
function validateQuiz(raw: any, topic: string, difficulty: string): any {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid quiz response');
  }

  // Handle case where questions are nested or at top level
  let questions = raw.questions;
  if (!Array.isArray(questions)) {
    // Maybe the AI returned an array directly
    if (Array.isArray(raw)) {
      questions = raw;
    } else {
      throw new Error('No questions array found in response');
    }
  }

  if (questions.length === 0) {
    throw new Error('Quiz has no questions');
  }

  const validatedQuestions = questions.map((q: any, index: number) => {
    // Ensure options exist and are an array of 4
    let options = q.options || q.choices || [];
    if (!Array.isArray(options) || options.length < 2) {
      options = ['A) Option A', 'B) Option B', 'C) Option C', 'D) Option D'];
    }

    // Make sure each option is a string and has proper LaTeX wrapping
    options = options.map((opt: any) => ensureLatexInOption(String(opt)));

    // Normalize correct answer
    const correct = normalizeCorrectAnswer(q.correct || q.answer || q.correctAnswer || 'A');

    return {
      id: q.id || index + 1,
      type: 'multiple_choice' as const,
      question: String(q.question || `Question ${index + 1}`),
      options,
      correct,
      explanation: String(q.explanation || q.solution || 'No explanation provided.'),
    };
  });

  return {
    title: String(raw.title || `${topic} Quiz`),
    topic: String(raw.topic || topic),
    difficulty: String(raw.difficulty || difficulty),
    questions: validatedQuestions,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { topic, schoolLevel, count, language } = await request.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const numQuestions = Math.min(Math.max(count || 5, 3), 15);
    const level = schoolLevel || 'high_school';
    const lang = language || 'en';

    // School level labels for display in quiz results
    const levelLabels: Record<string, Record<string, string>> = {
      middle_school: { en: 'Middle School', no: 'Ungdomsskole' },
      high_school: { en: 'High School', no: 'Videregående' },
      university: { en: 'University', no: 'Universitet' },
    };
    const levelLabel = levelLabels[level]?.[lang] || levelLabels.high_school.en;

    // Level-specific guidelines — designed for LEARNING, not testing
    let levelGuidelines = '';
    switch (level) {
      case 'middle_school':
        levelGuidelines = `SCHOOL LEVEL: Middle School (grades 7-10, ages 12-15)

WHAT TO QUIZ:
- Basic arithmetic with order of operations
- Fractions: adding, subtracting, multiplying, dividing
- Decimals and percentages (convert between them, find % of a number)
- Ratios and proportions
- Simple one-step and two-step equations (like $x + 5 = 12$ or $3x = 15$)
- Basic geometry: area of rectangle/triangle/circle, perimeter
- Angles: find missing angle in triangle, supplementary/complementary
- Basic statistics: find the mean, median, mode of a list

COMPLEXITY RULES:
- 1-2 steps maximum per problem
- Use small whole numbers (under 100) and simple fractions
- Most answers should be whole numbers or simple fractions like $\\frac{1}{2}$
- Only basic operators: $+$, $-$, $\\times$, $\\div$, simple exponents like $x^{2}$

NEVER USE:
- Trigonometry (sin/cos/tan), derivatives, integrals, matrices, logarithms, complex numbers, vertex, parabola, quadratic formula

EXAMPLE QUESTIONS FOR THIS LEVEL:
- "What is $\\frac{2}{3} + \\frac{1}{4}$?"
- "Solve: $2x + 3 = 11$"
- "A rectangle has length $8$ and width $5$. What is its area?"`;
        break;
      case 'university':
        levelGuidelines = `SCHOOL LEVEL: University / College (ages 18+)

WHAT TO QUIZ:
- Calculus: derivatives (chain rule, product rule), integrals (by parts, substitution), limits, series
- Linear algebra: matrix operations, determinants, eigenvalues, vector spaces
- Differential equations, probability distributions, discrete math
- Any advanced topic the student requests

COMPLEXITY RULES:
- Multi-step problems that combine concepts
- Can use all mathematical notation freely
- Can be genuinely challenging

EXAMPLE QUESTIONS FOR THIS LEVEL:
- "Find $\\int x \\cdot e^{x} \\, dx$"
- "What is the determinant of $\\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix}$?"
- "Find $\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$"`;
        break;
      default: // high_school
        levelGuidelines = `SCHOOL LEVEL: High School (grades 11-13, ages 15-18)

WHAT TO QUIZ:
- Algebra: solve equations (linear, quadratic using factoring or formula), simplify expressions, expand brackets
- Functions: evaluate $f(x)$ for given $x$, find where $f(x) = 0$, read values from a description
- Coordinate geometry: slope of a line, equation of a line through two points, distance between points
- Trigonometry: basic sin/cos/tan of standard angles ($30°$, $45°$, $60°$), right triangle problems
- Probability: simple counting, basic probability calculations
- Basic derivatives: derivative of polynomials like $3x^2 + 2x - 1$

COMPLEXITY RULES:
- 2-3 steps maximum per problem
- Each question should test ONE concept or skill, not combine many
- Numbers should be "clean" — answers come out to nice numbers, not messy decimals
- If the topic is "functions and graphs": ask things like "what is $f(2)$ if $f(x) = 3x + 1$?" or "where does $f(x) = 2x - 4$ cross the x-axis?" — NOT vertex form, NOT completing the square, NOT piecewise functions
- Problems should look like NORMAL SCHOOL EXERCISES, not tricky exam problems

NEVER USE (unless explicitly in the topic):
- Vertex of parabola, completing the square, piecewise functions, inverse functions, composite functions
- Eigenvalues, vector spaces, multivariable calculus, differential equations
- Abstract proofs or formal definitions

EXAMPLE QUESTIONS FOR THIS LEVEL:
- "Solve $x^2 - 9 = 0$"
- "If $f(x) = 2x + 3$, what is $f(4)$?"
- "Find the slope of the line through $(1, 3)$ and $(4, 9)$"
- "What is $\\frac{d}{dx}(5x^2 + 3x)$?"`;
    }

    // Dynamic language instruction — works for ANY language
    const LANGUAGE_NAMES: Record<string, string> = {
      en: 'English', no: 'Norwegian (Bokmål)', sv: 'Swedish', da: 'Danish', fi: 'Finnish',
      de: 'German', fr: 'French', es: 'Spanish', pt: 'Portuguese', it: 'Italian',
      nl: 'Dutch', pl: 'Polish', tr: 'Turkish', ar: 'Arabic', zh: 'Chinese (Simplified)',
      ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ru: 'Russian', uk: 'Ukrainian',
    };
    const langName = LANGUAGE_NAMES[lang] || 'English';
    const langInstruction = lang === 'en'
      ? 'LANGUAGE: Write ALL text (title, questions, options, explanations) in English. Math notation stays standard.'
      : `LANGUAGE: Write ALL text (title, questions, options, explanations) in ${langName}. Math symbols and LaTeX notation stay in standard form.`;

    const prompt = `Generate a math practice quiz designed to help students LEARN through solving problems.

TOPIC: ${topic}

${levelGuidelines}

NUMBER OF QUESTIONS: ${numQuestions}
${langInstruction}

QUIZ STRUCTURE - FOLLOW THIS RECIPE EXACTLY:
The quiz MUST follow this 3-stage structure for optimal learning:

STAGE 1 (First ${Math.ceil(numQuestions * 0.4)} questions): WARM-UP
- Test if student remembers basic formulas and concepts
- Very straightforward calculation problems
- One or two steps maximum
- Example: "What is $3 \\times 7$?", "Solve $x + 5 = 12$", "What is $\\frac{1}{2} + \\frac{1}{4}$?"

STAGE 2 (Next ${Math.floor(numQuestions * 0.4)} questions): INTERMEDIATE CALCULATION
- Apply formulas to concrete numbers
- Requires pen and paper to work through
- 2-4 calculation steps
- Should feel like "normal homework problems"
- Example: "Solve $2x^2 - 8 = 0$", "Find the area of a circle with radius $5$", "What is $\\frac{d}{dx}(3x^2 + 2x - 1)$?"

STAGE 3 (Last ${numQuestions - Math.ceil(numQuestions * 0.4) - Math.floor(numQuestions * 0.4)} questions): CHALLENGE / WORD PROBLEMS
- Student must figure out WHICH formula or method to use
- Practical application or scenario
- Combines understanding with calculation
- Example: "A rectangle has perimeter $24$ and width $4$. What is its area?", "If $f(x) = 2x + 1$ and $f(a) = 9$, what is $a$?"

CRITICAL RULES - EVERY QUESTION MUST:
✓ Require PEN AND PAPER to solve (not just memorization or definitions)
✓ Have numbers to calculate with (not just theory or formulas)
✓ Be a COMPUTATION problem (calculate, solve, find, evaluate)
✓ Have one clear numerical answer
✓ Feel like a NORMAL EXERCISE from school

✗ NEVER ask "What is the formula for...?"
✗ NEVER ask "Which of these is true about...?"
✗ NEVER ask "What does X mean?"
✗ NEVER ask purely theoretical or definition questions
✗ NEVER use wordy explanations inside the question (keep questions SHORT)

FORMATTING RULES:
1. Multiple choice with EXACTLY 4 options labeled A), B), C), D)
2. ALL math MUST use LaTeX: $x^2 + 3$ and $$\\frac{a}{b}$$
3. EVERY option MUST be wrapped: "A) $5$" NOT "A) 5"
4. NO Unicode math (√, ×, ÷) — use LaTeX (\\sqrt{}, \\times, \\div)
5. The "correct" field: ONLY the letter "A", "B", "C", or "D"
6. Keep questions SHORT — state the problem, ask for the answer
7. Wrong options should be realistic mistakes (sign error, calculation error)
8. Explanations: numbered steps with LaTeX, explain WHY each step
9. NEVER put text words like "or", "meters", "cm", "seconds" INSIDE LaTeX dollar signs. Keep units and words OUTSIDE:
   CORRECT: "A) $4\\sqrt{2}$ meters"
   WRONG: "A) $4\\sqrt{2} meters$"
   CORRECT: "A) $x = 2$ or $x = 3$"
   WRONG: "A) $x = 2 or x = 3$"
10. If an answer has two solutions, write: "A) $x = 2$ or $x = 3$" — NOT "A) $x = 2, 3$"
Return this exact JSON:
{
  "title": "Practice Quiz: ${topic}",
  "topic": "${topic}",
  "difficulty": "${levelLabel}",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is $3 \\times (5 + 2)$?",
      "options": ["A) $21$", "B) $17$", "C) $15$", "D) $13$"],
      "correct": "A",
      "explanation": "1. Parentheses first: $5 + 2 = 7$\\n2. Multiply: $3 \\times 7 = 21$"
    }
  ]
}

Generate exactly ${numQuestions} questions following the 3-stage structure.`;

    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,   // Very low for accurate, level-appropriate questions
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!responseText.trim()) {
      throw new Error('Empty response from AI');
    }

    console.log('[MathMaxx Quiz] Raw response length:', responseText.length);

    let rawQuiz;
    try {
      rawQuiz = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from markdown code blocks or wrapped text
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        rawQuiz = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        console.error('[MathMaxx Quiz] Failed to parse:', responseText.substring(0, 500));
        throw new Error('Failed to parse quiz response');
      }
    }

    // Validate and normalize the quiz structure
    const quiz = validateQuiz(rawQuiz, topic, levelLabel);
    console.log(`[MathMaxx Quiz] Generated ${quiz.questions.length} questions on "${topic}" (${levelLabel})`);

    return NextResponse.json(quiz);

  } catch (err: any) {
    console.error('[MathMaxx Quiz] Error:', err?.message);
    return NextResponse.json(
      { error: 'Failed to generate quiz. Please try again.', details: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
