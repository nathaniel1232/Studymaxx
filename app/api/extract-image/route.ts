import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

// Lazy-initialize Vertex AI at runtime (not build time)
let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    if (!projectId) {
      throw new Error('VERTEX_AI_PROJECT_ID not configured');
    }
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

    console.log(`[Extract Image] Processing ${images.length} images with Gemini 2.5 Flash Vision`);

    const extractedTexts: string[] = [];

    const model = getVertexAI().getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const ocrPrompt = `You are an expert OCR and language detection system. Transcribe all text from this image with PERFECT ACCURACY.

🚨 CRITICAL RULES (FOLLOW EXACTLY):
1. Keep text in ORIGINAL languages - NEVER translate
2. Preserve ALL special characters and accents (é, ñ, ü, å, ø, æ, ä, ö, etc.)
3. For vocabulary lists with word pairs, format as: word → translation
4. Ignore dates, page numbers, and non-educational content
5. If multiple languages exist, preserve them ALL exactly as shown

At the END of your response, add a line with the detected language(s):
DETECTED_LANGUAGES: [Exact Language Name]

🚨 CRITICAL: Do NOT guess! Use character and word patterns to make an ACCURATE identification.`;

    // Process each image with Gemini 2.5 Flash Vision
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      console.log(`[Extract Image] Processing image ${i + 1}/${images.length}`);

      try {
        // Parse data URL to get mime type and base64 data
        const dataUrlMatch = imageData.match(/^data:(.+?);base64,(.+)$/);
        if (!dataUrlMatch) {
          console.warn(`[Extract Image] ⚠️ Image ${i + 1}: Invalid data URL format`);
          continue;
        }
        const mimeType = dataUrlMatch[1];
        const base64Data = dataUrlMatch[2];

        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: ocrPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0,
          },
        });

        const extractedText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        
        if (extractedText.length > 10) {
          console.log(`[Extract Image] ✅ Image ${i + 1}: Extracted ${extractedText.length} characters`);
          console.log(`[Extract Image] Preview: ${extractedText.substring(0, 150)}...`);
          
          // Log detected languages if present
          const langMatch = extractedText.match(/DETECTED_LANGUAGES:\s*(.+?)$/m);
          if (langMatch) {
            console.log(`[Extract Image] 🌍 Detected languages: ${langMatch[1]}`);
          } else {
            console.warn(`[Extract Image] ⚠️ No DETECTED_LANGUAGES tag found in response`);
          }
          
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
