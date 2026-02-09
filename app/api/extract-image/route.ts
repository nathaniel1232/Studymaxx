import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let images: string[] = [];

    // Handle both FormData (file upload) and JSON (base64 images) formats
    if (contentType.includes('multipart/form-data')) {
      // File upload via FormData
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      images = [dataUrl];
      
      console.log(`[Extract Image] Processing uploaded file: ${file.name} (${file.type})`);
    } else {
      // JSON format with base64 images
      const body = await request.json();
      images = body.images;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return NextResponse.json(
          { error: 'No images provided' },
          { status: 400 }
        );
      }
    }

    console.log(`[Extract Image] Processing ${images.length} images with GPT-4 Vision`);

    const extractedTexts: string[] = [];

    // Process each image with GPT-4 Vision
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      console.log(`[Extract Image] Processing image ${i + 1}/${images.length}`);

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are an expert OCR and language detection system. Transcribe all text from this image with PERFECT ACCURACY.

🚨 CRITICAL RULES (FOLLOW EXACTLY):
1. Keep text in ORIGINAL languages - NEVER translate
2. Preserve ALL special characters and accents (é, ñ, ü, å, ø, æ, ä, ö, etc.)
3. For vocabulary lists with word pairs, format as: word → translation
4. Ignore dates, page numbers, and non-educational content
5. If multiple languages exist, preserve them ALL exactly as shown

🌍 LANGUAGE DETECTION (MOST IMPORTANT):
You MUST identify the language(s) with EXTREME PRECISION. Look for these clues:
- Special characters: å,ø,æ = Norwegian/Danish, ü,ö,ä,ß = German, ñ,¿,¡ = Spanish, à,è,é,ê,ç = French
- Common words: "og","det","som","en" = Norwegian, "und","der","die" = German, "y","el","la" = Spanish
- Word patterns: Finnish has lots of vowels and long words (Suomi, hyvää, tervetuloa)
- Text structure: Check headers, labels, and consistent patterns

🚨 ULTRA-SPECIFIC LANGUAGE IDENTIFICATION:
Spanish: ñ, ¿, ¡, words like: y, el, la, de, que, es, por, con
French: à, è, é, ê, ç, words like: le, la, de, et, un, est, pour, avec
German: ü, ö, ä, ß, words like: der, die, das, und, ist, zu, den, mit
Finnish: MANY double vowels (aa, oo, ee, ii, uu, yy, ää, öö), VERY long compound words, words like: ja, on, ei, että, se, tämä, hän, mikä
Norwegian: å, ø, æ, words like: og, er, det, som, en, av, på, til
Swedish: å, ä, ö, words like: och, är, det, som, en, av, för, att
Danish: Similar to Norwegian but uses "af" instead of "av"
Dutch: ij, words like: de, het, en, van, een, is, op, te
Italian: No special chars, words like: di, e, il, la, che, in, per, un
Portuguese: ã, õ, ç, words like: de, a, o, que, e, do, em, para

🚨 CRITICAL DISTINCTIONS:
- **Finnish vs German MUST BE DISTINGUISHED**: Finnish has MANY double vowels (aa, oo, ii), German has ß (German ONLY)
- If text has ß character = DEFINITELY German, NOT Finnish
- If text has many double vowels (aa, oo, uu, yy) = LIKELY Finnish
- If text has ñ character = DEFINITELY Spanish, NOT Finnish or German
- Finnish words are extremely long with many vowels, German words are shorter

At the END of your response, add a line with the detected language(s):
DETECTED_LANGUAGES: [Exact Language Name]

Examples:
- If text is in Finnish → DETECTED_LANGUAGES: Finnish
- If text is in Spanish → DETECTED_LANGUAGES: Spanish
- If text is bilingual Finnish-English → DETECTED_LANGUAGES: Finnish, English
- If text is in German → DETECTED_LANGUAGES: German

🚨 CRITICAL: Do NOT guess! Use the character and word patterns above to make an ACCURATE identification.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0,
        });

        const extractedText = response.choices[0]?.message?.content?.trim() || '';
        
        if (extractedText.length > 10) {
          console.log(`[Extract Image] ✅ Image ${i + 1}: Extracted ${extractedText.length} characters`);
          console.log(`[Extract Image] Preview: ${extractedText.substring(0, 150)}...`);
          extractedTexts.push(extractedText);
        } else {
          console.warn(`[Extract Image] ⚠️ Image ${i + 1}: Very little text found`);
        }
      } catch (error) {
        console.error(`[Extract Image] ❌ Failed to process image ${i + 1}:`, error);
        // Continue with other images even if one fails
      }
    }

    if (extractedTexts.length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the images' },
        { status: 400 }
      );
    }

    const combinedText = extractedTexts.join('\n\n');
    
    console.log(`[Extract Image] ✅ Successfully extracted text from ${extractedTexts.length}/${images.length} images`);
    console.log(`[Extract Image] Total characters: ${combinedText.length}`);

    return NextResponse.json({ 
      text: combinedText,
      imagesProcessed: extractedTexts.length,
      totalImages: images.length,
    });

  } catch (error) {
    console.error('[Extract Image] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process images' },
      { status: 500 }
    );
  }
}
