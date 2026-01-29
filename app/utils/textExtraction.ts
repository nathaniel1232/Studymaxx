/**
 * Text Extraction Utilities
 * Handles multiple file types with validation and cleanup
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractionResult {
  text: string;
  metadata: {
    fileType: string;
    wordCount: number;
    characterCount: number;
    language?: string;
    extractionMethod: string;
  };
  warnings?: string[];
}

/**
 * Validate extracted text quality
 */
export function validateExtractedText(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: "No text extracted" };
  }

  if (text.trim().length < 20) {
    return { valid: false, reason: "Text too short (minimum 20 characters)" };
  }

  // Check for reasonable word count
  const words = text.trim().split(/\s+/);
  if (words.length < 5) {
    return { valid: false, reason: "Not enough words (minimum 5 words)" };
  }

  // Check if text is mostly gibberish (too many non-alphanumeric chars)
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const alphanumericRatio = alphanumericCount / text.length;
  
  if (alphanumericRatio < 0.3) {
    return { valid: false, reason: "Text appears to be corrupted or contains too many special characters" };
  }

  // Check for extremely long words (likely OCR errors)
  const hasExtremelyLongWords = words.some(word => word.length > 50);
  if (hasExtremelyLongWords) {
    return { valid: false, reason: "Text contains suspicious formatting (possible OCR errors)" };
  }

  return { valid: true };
}

/**
 * Clean and normalize extracted text
 */
export function cleanText(text: string): string {
  let cleaned = text;

  // Normalize line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove multiple consecutive blank lines (keep max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Fix common OCR errors
  cleaned = cleaned.replace(/\s+/g, ' '); // Normalize spaces
  cleaned = cleaned.replace(/([a-z])-\s+([a-z])/gi, '$1$2'); // Fix hyphenated words across lines

  // Remove excessive whitespace
  cleaned = cleaned.trim();

  // Remove special characters that don't add value (but keep punctuation)
  // Keep: letters, numbers, common punctuation, Norwegian/European chars
  cleaned = cleaned.replace(/[^\w\s.,!?;:()\-'"æøåÆØÅäöüÄÖÜßéèêëáàâãíìîïóòôõúùûüçñ]/g, '');

  // Fix multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  // Ensure proper spacing after punctuation
  cleaned = cleaned.replace(/([.!?])([A-ZÆØÅ])/g, '$1 $2');

  return cleaned.trim();
}

/**
 * Detect file type from File object
 */
export function getFileType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Check by MIME type first
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
  if (mimeType.includes('text')) return 'txt';
  if (mimeType.includes('image')) {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    return 'image';
  }

  // Fallback to extension
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': 
    case 'doc': return 'docx';
    case 'txt': return 'txt';
    case 'png': return 'png';
    case 'jpg':
    case 'jpeg': return 'jpg';
    case 'gif': return 'gif';
    case 'bmp': return 'bmp';
    default: return 'unknown';
  }
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(fileType: string): boolean {
  const supported = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'image'];
  return supported.includes(fileType.toLowerCase());
}

/**
 * Get word and character count
 */
export function getTextStats(text: string) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const characters = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  return {
    wordCount: words.length,
    characterCount: characters,
    sentenceCount: sentences,
    avgWordLength: words.length > 0 ? (text.replace(/\s/g, '').length / words.length).toFixed(1) : '0'
  };
}

/**
 * Detect language from text sample
 */
/**
 * AI-Powered Language Detection
 * Uses OpenAI to accurately detect the language of any text
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    // Use ALL the text for maximum accuracy, just like flashcard generation does
    const sample = text; // Use entire text for accurate detection
    
    // Quick script-based detection for non-Latin scripts (very reliable)
    if ((sample.match(/[\u0370-\u03FF]/g)?.length ?? 0) > 5) return 'Greek';
    if ((sample.match(/[\u0600-\u06FF]/g)?.length ?? 0) > 5) return 'Arabic';
    if ((sample.match(/[\u0590-\u05FF]/g)?.length ?? 0) > 5) return 'Hebrew';
    if ((sample.match(/[\u0E00-\u0E7F]/g)?.length ?? 0) > 5) return 'Thai';
    if ((sample.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length ?? 0) > 3) return 'Japanese';
    if ((sample.match(/[\uAC00-\uD7AF]/g)?.length ?? 0) > 5) return 'Korean';
    if ((sample.match(/[\u4E00-\u9FFF]/g)?.length ?? 0) > 5) return 'Chinese';
    if ((sample.match(/[\u0400-\u04FF]/g)?.length ?? 0) > 10) {
      if (sample.includes('і') || sample.includes('ї') || sample.includes('є')) return 'Ukrainian';
      if (sample.includes('ъ') && sample.includes('ѝ')) return 'Bulgarian';
      if (sample.match(/[јљњћђџ]/)) return 'Serbian';
      return 'Russian';
    }
    if ((sample.match(/[\u0900-\u097F]/g)?.length ?? 0) > 5) return 'Hindi';
    if ((sample.match(/[\u0980-\u09FF]/g)?.length ?? 0) > 5) return 'Bengali';
    if ((sample.match(/[\u0B80-\u0BFF]/g)?.length ?? 0) > 5) return 'Tamil';
    
    // Analyze key indicator words and unique characters to guide AI
    const hints: string[] = [];
    
    // Unique character detection (used as hints, not definitive)
    if (sample.includes('ð') && sample.includes('þ')) {
      hints.push('Icelandic letters ð and þ detected');
    }
    if (sample.includes('ł')) hints.push('Polish letter ł detected');
    if (sample.includes('ř')) hints.push('Czech letter ř detected');
    if (sample.includes('ğ') && sample.includes('ı')) hints.push('Turkish letters ğ/ı detected');
    if (sample.match(/[țș]/)) hints.push('Romanian letters ț/ș detected');
    if (sample.match(/[ăâî]/)) hints.push('Romanian letters ă/â/î detected');
    
    // Word pattern detection
    if (sample.match(/\b(și|este|sunt|pentru|acest|această|într|către)\b/i)) hints.push('Romanian words detected');
    if (sample.match(/\b(không|và|của|là|có|này|được|trong)\b/i)) hints.push('Vietnamese words detected');
    if (sample.match(/\b(ikke|eller|også|derfor|allerede|gjennom)\b/i)) hints.push('Norwegian words detected');
    if (sample.match(/\b(að|ekki|þetta|fyrir|með|gegnum)\b/i)) hints.push('Icelandic words detected');
    // Word pattern detection
    if (sample.match(/\b(ikke|eller|også|derfor|allerede|gjennom)\b/i)) hints.push('Norwegian words detected');
    if (sample.match(/\b(að|ekki|þetta|fyrir|með|gegnum)\b/i)) hints.push('Icelandic words detected');
    if (sample.match(/\b(the|this|that|which|these|those|where)\b/i)) hints.push('English words detected');
    if (sample.match(/\b(der|die|das|und|nicht|auch)\b/i)) hints.push('German words detected');
    if (sample.match(/\b(le|la|les|dans|avec|sont)\b/i)) hints.push('French words detected');
    if (sample.match(/\b(het|een|van|zijn|deze|worden)\b/i)) hints.push('Dutch words detected');
    if (sample.match(/\b(jag|och|till|från)\b/i)) hints.push('Swedish words detected');
    if (sample.match(/\b(jeg|af|blev|alle)\b/i)) hints.push('Danish words detected');
    
    const hintText = hints.length > 0 ? `\n\nPattern hints detected: ${hints.join(', ')}` : '';
    
    // For Latin-script languages, use AI detection with enhanced prompt
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert linguist. Analyze the text and respond with ONLY the language name in English.

KEY DISTINCTIONS:

**Nordic Languages:**
- **Norwegian**: "ikke", "også", "være", "eller", "gjennom", "mennesker". Uses æ, ø, å (NO ð or þ).
- **Icelandic**: "að", "ekki", "þetta", "fyrir", "með". ALWAYS has ð AND þ.
- **Swedish**: "jag", "och", "till", "från", "är". Uses å, ä, ö.
- **Danish**: "jeg", "af", "blev", "alle", "gennem". Uses æ, ø, å.

**Romance Languages:**
- **Romanian**: "și", "este", "sunt", "pentru", "acest", "către". Has UNIQUE letters ă, â, î, ș, ț (with comma below).
- **Italian**: "il", "la", "di", "che", "non", "sono"
- **Spanish**: "el", "la", "que", "de", "y", "más"
- **Portuguese**: "o", "a", "de", "que", "não", "é"
- **French**: "le", "la", "de", "et", "est", "dans"

**Asian Languages:**
- **Vietnamese**: "không", "và", "của", "là", "có", "này", "được". Has MANY tone marks on vowels (à, á, ả, ã, ạ, ă, ằ, etc).

**Other:**
- **English**: "the", "this", "that", "which", "where"
- **German**: "der", "die", "das", "und", "nicht". Has ä, ö, ü, ß.
- **Polish**: Has ł. Words: "w", "na", "się", "że"
- **Czech**: Has ř. Words: "je", "se", "v", "že"
- **Turkish**: Has ğ and ı. Words: "için", "değil"

CRITICAL: Romanian (ț/ș with comma below) vs Vietnamese (tone marks) - completely different scripts.

Respond with ONE word only - the language name.`
        },
        {
          role: 'user',
          content: `What language is this text?${hintText}\n\n"${sample}"`
        }
      ],
      temperature: 0,
      max_tokens: 10,
    });
    
    const detectedLanguage = response.choices[0]?.message?.content?.trim() || 'English';
    console.log('[AI Language Detection]:', detectedLanguage, hints.length > 0 ? `(hints: ${hints.join(', ')})` : '');
    return detectedLanguage;
    
  } catch (error) {
    console.error('[Language Detection Error]:', error);
    // Fallback to English on error
    return 'English';
  }
}
