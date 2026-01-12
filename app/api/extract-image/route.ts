import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
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
                  text: `Extract ALL educational content from this image. Focus ONLY on the subject matter that students need to learn.

EXTRACT:
✅ Learning objectives and goals
✅ Definitions and concepts
✅ Theories and principles
✅ Processes and procedures
✅ Facts and information
✅ Examples and explanations
✅ Formulas and equations
✅ Diagrams explanations
✅ Key terms and vocabulary

IGNORE:
❌ Exam dates, times, or schedules
❌ Physical locations or platforms
❌ Week numbers or administrative dates
❌ Testing format information
❌ Page numbers, headers, footers
❌ Where/when exams take place
❌ Any logistical/metadata details

Return ONLY the educational content as clean, well-formatted text. If the image contains a table or diagram, describe it clearly. If there are multiple sections, separate them with line breaks.`,
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
          temperature: 0.3,
        });

        const extractedText = response.choices[0]?.message?.content?.trim() || '';
        
        if (extractedText.length > 10) {
          console.log(`[Extract Image] ✅ Image ${i + 1}: Extracted ${extractedText.length} characters`);
          console.log(`[Extract Image] Preview: ${extractedText.substring(0, 150)}...`);
          extractedTexts.push(`--- Image ${i + 1} ---\n${extractedText}`);
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
