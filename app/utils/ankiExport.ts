/**
 * Anki Export Utility
 * Exports flashcards to Anki-compatible format (.txt for AnkiWeb import)
 */

export interface Flashcard {
  question: string;
  answer: string;
  explanation?: string;
}

/**
 * Export flashcards to Anki format (tab-separated values)
 * Format: Front\tBack\tTags
 */
export function exportToAnki(flashcards: Flashcard[], deckName: string): string {
  // Anki import format: question TAB answer TAB tags
  const ankiFormat = flashcards.map(card => {
    const front = card.question.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const back = card.answer.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const explanation = card.explanation ? `<br><br><i>${card.explanation.replace(/\t/g, ' ').replace(/\n/g, '<br>')}</i>` : '';
    
    return `${front}\t${back}${explanation}\t${deckName}`;
  }).join('\n');

  return ankiFormat;
}

/**
 * Download Anki file
 */
export function downloadAnkiFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
