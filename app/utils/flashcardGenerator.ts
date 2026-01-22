interface Flashcard {
  id: string;
  question: string;
  answer: string;
  distractors?: string[];
}

/**
 * Generate flashcards using the AI API
 * @param text - The material to create flashcards from
 * @param numberOfFlashcards - Number of cards to generate
 * @param subject - Subject being studied (optional)
 * @param targetGrade - Target grade (A-F) (optional)
 * @param userId - User ID for premium checks (optional, will be auto-generated if not provided)
 * @param materialType - Type of material (notes, pdf, youtube, image) - notes has no limits
 * @param outputLanguage - Language for flashcard output: "auto" (detect from input) or "en" (English)
 * @param difficulty - Difficulty level (Easy, Medium, Hard)
 * @param includeMath - Whether to use math problem mode
 * @param knownLanguage - Language the student knows (for language learning)
 * @param learningLanguage - Language the student is learning (for language learning)
 */
export async function generateFlashcards(
  text: string,
  numberOfFlashcards: number = 10,
  subject?: string,
  targetGrade?: string,
  userId?: string,
  materialType: string = "notes",
  outputLanguage: "auto" | "en" = "auto",
  difficulty: string = "Medium",
  includeMath: boolean = false,
  knownLanguage?: string,
  learningLanguage?: string
): Promise<Flashcard[]> {
  // Get or generate userId
  const effectiveUserId = userId || (typeof window !== 'undefined' 
    ? localStorage.getItem('userId') || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    : `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const res = await fetch("/api/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      text,
      numberOfFlashcards,
      subject,
      targetGrade,
      difficulty,
      includeMath,
      userId: effectiveUserId,
      materialType: materialType,
      outputLanguage: outputLanguage,
      knownLanguage,
      learningLanguage,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    
    // Handle specific error codes
    if (res.status === 402) {
      // Premium required
      throw new Error(data?.error || "PREMIUM_REQUIRED");
    } else if (res.status === 429) {
      // Daily limit reached
      throw new Error(data?.error || "DAILY_LIMIT_REACHED");
    }
    
    throw new Error(data?.error || "Failed to generate flashcards");
  }

  const cards = await res.json();
  return cards;
}
