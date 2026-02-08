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
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Transcribe all text from this image exactly as written.
                  
IMPORTANT RULES:
1. Keep text in original languages - do NOT translate anything
2. For vocabulary lists (word pairs), format as: word1 → translation1
3. Preserve all special characters and accents (é, ñ, ü, etc.)
4. Ignore dates, page numbers, and non-educational content
5. If this is a vocabulary list between two languages, preserve BOTH languages exactly

Output format for vocabulary:
word → translation
word → translation

At the END of your response, add a line:
DETECTED_LANGUAGES: [Language1], [Language2]

Example: DETECTED_LANGUAGES: French, English`,
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
