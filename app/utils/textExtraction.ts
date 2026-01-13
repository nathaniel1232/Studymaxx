/**
 * Text Extraction Utilities
 * Handles multiple file types with validation and cleanup
 */

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
export function detectLanguage(text: string): string {
  const sample = text.slice(0, 1000).toLowerCase();
  
  // Norwegian indicators
  const norwegianWords = ['og', 'er', 'det', 'på', 'til', 'med', 'som', 'for', 'av', 'en', 'å', 'ikke', 'har', 'skal', 'kan', 'være', 'fra'];
  const norwegianChars = ['æ', 'ø', 'å'];
  
  // Spanish indicators
  const spanishWords = ['el', 'la', 'los', 'las', 'de', 'que', 'es', 'en', 'un', 'una', 'por', 'para'];
  const spanishChars = ['ñ', '¿', '¡'];
  
  // French indicators
  const frenchWords = ['le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'dans', 'pour'];
  
  // German indicators
  const germanWords = ['der', 'die', 'das', 'und', 'ist', 'in', 'den', 'von', 'zu', 'mit'];
  const germanChars = ['ä', 'ö', 'ü', 'ß'];
  
  // English indicators
  const englishWords = ['the', 'is', 'are', 'was', 'were', 'this', 'that', 'what', 'which', 'have'];
  
  // Icelandic indicators
  const icelandicWords = ['og', 'er', 'að', 'ekki', 'við', 'það', 'fyrir', 'með', 'sem', 'eru', 'var', 'hann', 'hún'];
  const icelandicChars = ['ð', 'þ', 'ö', 'á', 'í', 'ú', 'ý'];

  // Indonesian indicators (Bahasa)
  const indonesianWords = ['yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'saya', 'mereka', 'adalah', 'dengan', 'tidak', 'akan', 'pada', 'bisa'];

  // Check for Script-based languages first (Arabic, Cyrillic, CJK, etc) because they are definitive
  
  // Arabic Script Range
  const arabicMatch = sample.match(/[\u0600-\u06FF]/g);
  if (arabicMatch && arabicMatch.length > 5) return 'Arabic';

  // Cyrillic Script Range (Russian, Ukrainian, etc)
  const cyrillicMatch = sample.match(/[\u0400-\u04FF]/g);
  if (cyrillicMatch && cyrillicMatch.length > 5) return 'Russian'; // Default to Russian for Cyrillic for now

  // CJK (Chinese, Japanese, Korean)
  const cjkMatch = sample.match(/[\u4e00-\u9fa5]/g);
  if (cjkMatch && cjkMatch.length > 5) return 'Chinese';

  let scores: { [key: string]: number } = {
    Norwegian: 0,
    Spanish: 0,
    French: 0,
    German: 0,
    English: 0,
    Icelandic: 0,
    Indonesian: 0,
    Italian: 0,
    Portuguese: 0
  };

  // Italian indicators
  const italianWords = ['il', 'la', 'i', 'gli', 'le', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra'];
  
  // Portuguese indicators
  const portugueseWords = ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não', 'é'];
  const portugueseChars = ['ã', 'õ', 'ç'];
  
  // Score by words
  norwegianWords.forEach(word => {
    scores.Norwegian += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  spanishWords.forEach(word => {
    scores.Spanish += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  frenchWords.forEach(word => {
    scores.French += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  germanWords.forEach(word => {
    scores.German += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  englishWords.forEach(word => {
    scores.English += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  icelandicWords.forEach(word => {
    scores.Icelandic += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  indonesianWords.forEach(word => {
    scores.Indonesian += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  italianWords.forEach(word => {
    scores.Italian += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  portugueseWords.forEach(word => {
    scores.Portuguese += (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  
  // Score by special characters (weighted higher)
  norwegianChars.forEach(char => scores.Norwegian += (sample.split(char).length - 1) * 3);
  spanishChars.forEach(char => scores.Spanish += (sample.split(char).length - 1) * 3);
  germanChars.forEach(char => scores.German += (sample.split(char).length - 1) * 3);
  icelandicChars.forEach(char => scores.Icelandic += (sample.split(char).length - 1) * 5);
  portugueseChars.forEach(char => scores.Portuguese += (sample.split(char).length - 1) * 5);

  // SPECIAL RULE: If 'ð' or 'þ' are present, it is HIGHLY likely Icelandic, not Norwegian
  if (sample.includes('ð') || sample.includes('þ')) {
    scores.Icelandic += 50;
    scores.Norwegian -= 20; // Penalize Norwegian if these chars exist
  }
  
  // Find highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  
  // If no clear winner, fallback to English
  return sorted[0][1] > 2 ? sorted[0][0] : 'English';
}
