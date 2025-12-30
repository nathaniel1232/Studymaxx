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
 */
export async function generateFlashcards(
  text: string,
  numberOfFlashcards: number = 10,
  subject?: string,
  targetGrade?: string,
  userId?: string
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
      difficulty: "Medium", // Default difficulty
      userId: effectiveUserId,
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
