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
  const sample = text.slice(0, 1500).toLowerCase();
  
  // ============ SCRIPT-BASED DETECTION (Most Reliable) ============
  
  // Greek
  const greekMatch = sample.match(/[\u0370-\u03FF]/g);
  if (greekMatch && greekMatch.length > 5) return 'Greek';
  
  // Arabic, Persian, Urdu
  const arabicMatch = sample.match(/[\u0600-\u06FF]/g);
  if (arabicMatch && arabicMatch.length > 5) return 'Arabic';
  
  // Hebrew
  const hebrewMatch = sample.match(/[\u0590-\u05FF]/g);
  if (hebrewMatch && hebrewMatch.length > 5) return 'Hebrew';
  
  // Thai
  const thaiMatch = sample.match(/[\u0E00-\u0E7F]/g);
  if (thaiMatch && thaiMatch.length > 5) return 'Thai';
  
  // Japanese (Hiragana, Katakana)
  const hiraganaMatch = sample.match(/[\u3040-\u309F]/g);
  const katakanaMatch = sample.match(/[\u30A0-\u30FF]/g);
  if ((hiraganaMatch && hiraganaMatch.length > 3) || (katakanaMatch && katakanaMatch.length > 3)) return 'Japanese';
  
  // Korean (Hangul)
  const hangulMatch = sample.match(/[\uAC00-\uD7AF]/g);
  if (hangulMatch && hangulMatch.length > 5) return 'Korean';
  
  // Chinese (Hanzi)
  const hanziMatch = sample.match(/[\u4E00-\u9FFF]/g);
  if (hanziMatch && hanziMatch.length > 5) return 'Chinese';
  
  // Cyrillic - Detect specific languages
  const cyrillicMatch = sample.match(/[\u0400-\u04FF]/g);
  if (cyrillicMatch && cyrillicMatch.length > 10) {
    // Russian specific: ы, э, ъ
    if (sample.includes('ы') || sample.includes('э') || sample.includes('ъ')) return 'Russian';
    // Ukrainian specific: і, ї, є, ґ
    if (sample.includes('і') || sample.includes('ї') || sample.includes('є') || sample.includes('ґ')) return 'Ukrainian';
    // Bulgarian specific: ъ, ѝ
    if (sample.includes('ъ') && sample.includes('ѝ')) return 'Bulgarian';
    // Serbian: ј, љ, њ, ћ, ђ, џ
    if (sample.match(/[јљњћђџ]/)) return 'Serbian';
    return 'Russian'; // Default for Cyrillic
  }
  
  // Devanagari (Hindi, Sanskrit, Marathi)
  const devanagariMatch = sample.match(/[\u0900-\u097F]/g);
  if (devanagariMatch && devanagariMatch.length > 5) return 'Hindi';
  
  // Bengali
  const bengaliMatch = sample.match(/[\u0980-\u09FF]/g);
  if (bengaliMatch && bengaliMatch.length > 5) return 'Bengali';
  
  // Tamil
  const tamilMatch = sample.match(/[\u0B80-\u0BFF]/g);
  if (tamilMatch && tamilMatch.length > 5) return 'Tamil';
  
  // Telugu
  const teluguMatch = sample.match(/[\u0C00-\u0C7F]/g);
  if (teluguMatch && teluguMatch.length > 5) return 'Telugu';
  
  // Gujarati
  const gujaratiMatch = sample.match(/[\u0A80-\u0AFF]/g);
  if (gujaratiMatch && gujaratiMatch.length > 5) return 'Gujarati';
  
  // ============ LATIN SCRIPT LANGUAGES ============

  // ============ LATIN SCRIPT LANGUAGES ============
  
  // Define comprehensive word indicators for each language
  const languageWords: { [key: string]: string[] } = {
    English: ['the', 'is', 'are', 'was', 'were', 'this', 'that', 'what', 'which', 'have', 'been', 'from', 'they', 'their', 'about', 'would', 'there', 'could', 'should'],
    Spanish: ['el', 'la', 'los', 'las', 'de', 'que', 'es', 'en', 'un', 'una', 'por', 'para', 'con', 'del', 'al', 'como', 'pero', 'más', 'todo', 'esta', 'están'],
    French: ['le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'dans', 'pour', 'que', 'qui', 'pas', 'nous', 'vous', 'sont', 'tout', 'mais', 'avec', 'ces', 'été'],
    German: ['der', 'die', 'das', 'und', 'ist', 'in', 'den', 'von', 'zu', 'mit', 'auf', 'für', 'auch', 'nicht', 'werden', 'sein', 'wurde', 'diesem', 'werden', 'einer'],
    Italian: ['il', 'la', 'i', 'gli', 'le', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'del', 'della', 'sono', 'essere', 'stato', 'anche', 'molto'],
    Portuguese: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não', 'é', 'que', 'são', 'por', 'mais', 'dos', 'como', 'está'],
    Dutch: ['de', 'het', 'een', 'en', 'van', 'ik', 'te', 'dat', 'die', 'in', 'is', 'niet', 'zijn', 'op', 'aan', 'voor', 'met', 'als', 'hebben', 'worden', 'deze', 'werd'],
    Norwegian: ['og', 'er', 'det', 'på', 'til', 'med', 'som', 'for', 'av', 'en', 'å', 'ikke', 'har', 'skal', 'kan', 'være', 'fra', 'ved', 'eller', 'blir', 'denne'],
    Swedish: ['och', 'i', 'är', 'det', 'som', 'till', 'en', 'av', 'för', 'att', 'med', 'inte', 'på', 'jag', 'den', 'har', 'var', 'blir', 'från', 'om', 'alla'],
    Danish: ['og', 'i', 'er', 'det', 'som', 'til', 'en', 'af', 'for', 'at', 'med', 'ikke', 'jeg', 'vi', 'den', 'har', 'var', 'fra', 'blev', 'alle', 'denne'],
    Icelandic: ['og', 'er', 'að', 'ekki', 'við', 'það', 'fyrir', 'með', 'sem', 'eru', 'var', 'hann', 'hún', 'þetta', 'vera', 'hafa', 'frá', 'til', 'upp', 'um'],
    Finnish: ['on', 'ja', 'ei', 'se', 'että', 'oli', 'olla', 'voi', 'hän', 'nyt', 'kun', 'mutta', 'jos', 'kuin', 'tai', 'niin', 'joka', 'sen', 'kaikki', 'ovat'],
    Polish: ['i', 'w', 'na', 'z', 'do', 'nie', 'się', 'o', 'że', 'to', 'jest', 'od', 'za', 'co', 'jak', 'ale', 'jego', 'czy', 'być', 'był', 'jako'],
    Czech: ['a', 'je', 'se', 'v', 'na', 'že', 'z', 'o', 'to', 'do', 's', 'za', 'by', 'jako', 'pro', 'byl', 'jsou', 'nebo', 'při', 'také'],
    Slovak: ['a', 'je', 'v', 'na', 'sa', 'že', 'do', 'o', 'z', 'si', 'to', 'ako', 'za', 'aj', 'by', 's', 'pre', 'od', 'po', 'nie'],
    Hungarian: ['a', 'az', 'és', 'van', 'hogy', 'nem', 'ez', 'volt', 'de', 'meg', 'egy', 'még', 'mint', 'le', 'el', 'amit', 'csak', 'már', 'igen', 'most'],
    Romanian: ['de', 'a', 'în', 'la', 'și', 'cu', 'un', 'o', 'este', 'pentru', 'pe', 'din', 'al', 'unei', 'că', 'sunt', 'era', 'mai', 'sau', 'dar'],
    Turkish: ['ve', 'bir', 'bu', 'da', 'de', 'değil', 'mi', 'ne', 'ile', 'için', 'var', 'yok', 'gibi', 'daha', 'çok', 'kadar', 'olan', 'ama', 'ancak'],
    Indonesian: ['yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'saya', 'mereka', 'adalah', 'dengan', 'tidak', 'akan', 'pada', 'bisa', 'ada', 'juga', 'atau'],
    Malay: ['yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'tidak', 'pada', 'adalah', 'ada', 'atau', 'juga', 'akan', 'telah', 'boleh', 'sudah'],
    Vietnamese: ['và', 'của', 'là', 'có', 'này', 'được', 'trong', 'cho', 'với', 'để', 'các', 'đã', 'một', 'những', 'không', 'người', 'hay', 'như', 'từ'],
    Tagalog: ['ang', 'ng', 'sa', 'na', 'ay', 'mga', 'at', 'kung', 'para', 'ito', 'ko', 'mo', 'po', 'ako', 'siya', 'niya', 'yan', 'kasi', 'lang', 'daw'],
    Croatian: ['i', 'u', 'je', 'se', 'na', 'za', 'da', 'su', 'to', 's', 'od', 'po', 'kao', 'iz', 'ili', 'bio', 'koja', 'biti', 'nije', 'ima'],
    Lithuanian: ['ir', 'yra', 'kad', 'į', 'tai', 'su', 'bet', 'ne', 'jo', 'kai', 'jis', 'už', 'dar', 'bei', 'buvo', 'turi', 'nuo', 'kas', 'per', 'bus'],
    Latvian: ['un', 'ir', 'ar', 'uz', 'par', 'no', 'bet', 'kas', 'ka', 'tas', 'lai', 'vai', 'pie', 'gan', 'tā', 'pēc', 'arī', 'bija', 'tiek', 'būt'],
    Estonian: ['ja', 'on', 'ei', 'see', 'kui', 'oli', 'siis', 'ning', 'või', 'aga', 'et', 'ka', 'ta', 'nii', 'veel', 'kuid', 'olla', 'pole', 'kes', 'just'],
  };
  
  // Special characters for each language
  const languageChars: { [key: string]: string[] } = {
    Spanish: ['ñ', '¿', '¡', 'á', 'é', 'í', 'ó', 'ú'],
    French: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ç', 'ï', 'î', 'ô'],
    German: ['ä', 'ö', 'ü', 'ß'],
    Portuguese: ['ã', 'õ', 'ç', 'á', 'é', 'í', 'ó', 'ú', 'â', 'ê', 'ô'],
    Norwegian: ['æ', 'ø', 'å'],
    Swedish: ['å', 'ä', 'ö'],
    Danish: ['æ', 'ø', 'å'],
    Icelandic: ['ð', 'þ', 'ö', 'á', 'í', 'ú', 'ý', 'ó', 'é', 'æ'],
    Finnish: ['ä', 'ö', 'å'],
    Polish: ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'],
    Czech: ['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž'],
    Slovak: ['á', 'ä', 'č', 'ď', 'é', 'í', 'ĺ', 'ľ', 'ň', 'ó', 'ô', 'ŕ', 'š', 'ť', 'ú', 'ý', 'ž'],
    Hungarian: ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű'],
    Romanian: ['ă', 'â', 'î', 'ș', 'ț'],
    Turkish: ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü'],
    Lithuanian: ['ą', 'č', 'ę', 'ė', 'į', 'š', 'ų', 'ū', 'ž'],
    Latvian: ['ā', 'č', 'ē', 'ģ', 'ī', 'ķ', 'ļ', 'ņ', 'š', 'ū', 'ž'],
    Estonian: ['ä', 'ö', 'õ', 'ü', 'š', 'ž'],
    Croatian: ['č', 'ć', 'đ', 'š', 'ž'],
  };

  let scores: { [key: string]: number } = {};
  
  // Initialize scores for all languages
  Object.keys(languageWords).forEach(lang => scores[lang] = 0);

  // Score by words
  Object.entries(languageWords).forEach(([lang, words]) => {
    words.forEach(word => {
      const matches = sample.match(new RegExp(`\\b${word}\\b`, 'g'));
      if (matches) scores[lang] += matches.length;
    });
  });

  // Score by special characters (weighted heavily - 5x)
  Object.entries(languageChars).forEach(([lang, chars]) => {
    chars.forEach(char => {
      const count = sample.split(char).length - 1;
      if (count > 0) scores[lang] += count * 5;
    });
  });

  // Score by special characters (weighted heavily - 5x)
  Object.entries(languageChars).forEach(([lang, chars]) => {
    chars.forEach(char => {
      const count = sample.split(char).length - 1;
      if (count > 0) scores[lang] += count * 5;
    });
  });

  // ============ SPECIAL PATTERN BONUSES ============
  
  // Icelandic: ð and þ are UNIQUE to Icelandic
  if (sample.includes('ð') || sample.includes('þ')) {
    scores.Icelandic = (scores.Icelandic || 0) + 100;
    scores.Norwegian = Math.max(0, (scores.Norwegian || 0) - 20);
  }
  
  // Dutch: distinctive double vowels and ij digraph
  const dutchPatterns = sample.match(/\b\w*(aa|ee|oo|uu|ij)\w*\b/gi);
  if (dutchPatterns && dutchPatterns.length > 3) {
    scores.Dutch = (scores.Dutch || 0) + dutchPatterns.length * 4;
  }
  
  // Finnish: distinctive double consonants (kk, tt, ll, etc.)
  const finnishPatterns = sample.match(/\b\w*(kk|tt|ll|mm|nn|pp|ss)\w*\b/gi);
  if (finnishPatterns && finnishPatterns.length > 4) {
    scores.Finnish = (scores.Finnish || 0) + finnishPatterns.length * 3;
  }
  
  // Vietnamese: tone marks combined with vowels
  if (sample.match(/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g)) {
    scores.Vietnamese = (scores.Vietnamese || 0) + 50;
  }
  
  // Turkish: ğ and ı are very distinctive
  if (sample.includes('ğ') || sample.includes('ı')) {
    scores.Turkish = (scores.Turkish || 0) + 30;
  }
  
  // Polish: ł is unique to Polish
  if (sample.includes('ł')) {
    scores.Polish = (scores.Polish || 0) + 25;
  }
  
  // Czech: ř is unique to Czech
  if (sample.includes('ř')) {
    scores.Czech = (scores.Czech || 0) + 30;
  }
  
  // Romanian: ș and ț (with comma below, not cedilla)
  if (sample.includes('ș') || sample.includes('ț')) {
    scores.Romanian = (scores.Romanian || 0) + 30;
  }
  
  // Hungarian: double acute accents (ő, ű)
  if (sample.includes('ő') || sample.includes('ű')) {
    scores.Hungarian = (scores.Hungarian || 0) + 30;
  }
  
  // Tagalog: "ng" is extremely common
  const tagalogNg = sample.match(/\bng\b/g);
  if (tagalogNg && tagalogNg.length > 2) {
    scores.Tagalog = (scores.Tagalog || 0) + tagalogNg.length * 5;
  }
  
  // Spanish vs Portuguese disambiguation
  if ((scores.Spanish || 0) > 5 && (scores.Portuguese || 0) > 5) {
    // Look for Portuguese-specific patterns
    if (sample.includes('ão') || sample.includes('ções') || sample.includes('lh')) {
      scores.Portuguese = (scores.Portuguese || 0) + 15;
      scores.Spanish = Math.max(0, (scores.Spanish || 0) - 10);
    }
    // Look for Spanish-specific patterns
    if (sample.includes('ción') || sample.includes('ñ')) {
      scores.Spanish = (scores.Spanish || 0) + 15;
      scores.Portuguese = Math.max(0, (scores.Portuguese || 0) - 10);
    }
  }
  
  // Swedish vs Norwegian vs Danish disambiguation
  if ((scores.Swedish || 0) > 5 || (scores.Norwegian || 0) > 5 || (scores.Danish || 0) > 5) {
    // Swedish unique: "jag" (I)
    if (sample.includes('jag')) {
      scores.Swedish = (scores.Swedish || 0) + 20;
    }
    // Norwegian unique: "ikke" (not)
    if (sample.includes('ikke')) {
      scores.Norwegian = (scores.Norwegian || 0) + 20;
    }
  }
  
  // Find highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  
  // Require a minimum confidence score
  if (sorted[0][1] < 3) {
    // Check if it looks like English by default (has many Latin letters but no clear language match)
    const latinLetters = sample.match(/[a-z]/g);
    if (latinLetters && latinLetters.length > 50) return 'English';
    return 'Unknown';
  }
  
  return sorted[0][0];
}
