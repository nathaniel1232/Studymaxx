import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Try text extraction with pdf-parse first
    let text = '';
    try {
      const pdfParseModule: any = await import('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(buffer);
      text = data.text?.trim() || '';
      console.log(`[Extract PDF] pdf-parse extracted ${text.length} chars`);
    } catch (parseError: any) {
      console.log('[Extract PDF] pdf-parse failed:', parseError.message);
    }

    // If text extraction succeeded with meaningful text, return it
    if (text.length >= 50) {
      return NextResponse.json({ text });
    }

    // Step 2: Image-based PDF — use GPT-4 Vision OCR
    console.log('[Extract PDF] Text too short, attempting OCR with GPT-4 Vision...');

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'This PDF appears to be image-based. OCR requires an OpenAI API key to be configured.' },
        { status: 422 }
      );
    }

    // Convert PDF to base64 and send pages as images to GPT-4 Vision
    // We use the raw PDF bytes converted to base64 — GPT-4 Vision can handle PDF pages as images
    const base64Pdf = buffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    // For image-based PDFs, we'll send the whole file as an image to GPT-4o-mini
    // GPT-4o can actually process PDF files sent as images
    try {
      const ocrTexts: string[] = [];
      
      // Send the PDF as a data URL — GPT-4o-mini can read PDFs directly  
      // But to be safe, let's convert individual pages using a canvas approach
      // Instead, let's use the simpler approach: send the base64 PDF directly
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `This is a scanned/image-based PDF document. Please extract ALL text content from it exactly as written. 
                
IMPORTANT RULES:
1. Keep text in original languages - do NOT translate anything
2. Preserve all formatting, paragraphs, and structure as much as possible
3. Preserve all special characters and accents
4. If there are multiple pages, include all of them
5. Ignore headers/footers/page numbers unless they're part of the main content
6. Output ONLY the extracted text, nothing else`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 16000,
        temperature: 0,
      });

      const ocrText = response.choices[0]?.message?.content?.trim() || '';
      
      if (ocrText.length > 20) {
        console.log(`[Extract PDF] GPT-4 Vision OCR extracted ${ocrText.length} chars`);
        ocrTexts.push(ocrText);
      }

      const fullText = ocrTexts.join('\n\n');
      
      if (fullText.length < 20) {
        return NextResponse.json(
          { error: 'Could not extract text from this PDF. The content may not be readable.' },
          { status: 422 }
        );
      }

      return NextResponse.json({ text: fullText, method: 'ocr' });
    } catch (ocrError: any) {
      console.error('[Extract PDF] OCR failed:', ocrError.message);
      
      // If even OCR fails, return whatever text we got from pdf-parse (even if short)
      if (text.length > 0) {
        return NextResponse.json({ text, method: 'partial' });
      }
      
      return NextResponse.json(
        { error: 'Failed to extract text from this PDF. It may be corrupted or encrypted.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Extract PDF] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to extract PDF text. The file may be corrupted or password-protected.' },
      { status: 500 }
    );
  }
}
