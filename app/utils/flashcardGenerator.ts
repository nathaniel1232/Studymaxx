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
 */
export async function generateFlashcards(
  text: string,
  numberOfFlashcards: number = 10,
  subject?: string,
  targetGrade?: string
): Promise<Flashcard[]> {
  const res = await fetch("/api/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      text,
      numberOfFlashcards,
      subject,
      targetGrade,
      difficulty: "Medium" // Default difficulty
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to generate flashcards");
  }

  const cards = await res.json();
  return cards;
}
