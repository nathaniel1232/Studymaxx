import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 120;

async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // @ts-expect-error - canvas is a native module without types
    const { createCanvas } = await import('canvas');
    
    // Load PDF with pdfjs-dist
    const loadingTask = getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = Math.min(pdfDoc.numPages, 5); // Max 5 pages
    const images: string[] = [];
    
    console.log(`[PDF to Images] Converting ${numPages} pages...`);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality
      
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
        canvas: canvas as any,
      }).promise;
      
      // Convert canvas to base64 PNG
      const dataUrl = canvas.toDataURL('image/png');
      images.push(dataUrl);
      console.log(`[PDF to Images] ✅ Converted page ${pageNum}`);
    }
    
    return images;
  } catch (error: any) {
    console.error('[PDF to Images] Conversion failed:', error.message);
    throw error;
  }
}

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

    console.log(`[Extract PDF] Processing: ${file.name} (${(buffer.length / 1024).toFixed(2)} KB)`);

    // Step 1: Try text extraction with pdf-parse first
    let text = '';
    try {
      const pdfParseModule: any = await import('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(buffer);
      text = data.text?.trim() || '';
      console.log(`[Extract PDF] pdf-parse: ${text.length} chars`);
    } catch (parseError: any) {
      console.log('[Extract PDF] pdf-parse failed:', parseError.message);
    }

    // If text extraction succeeded, return it
    if (text.length >= 50) {
      console.log('[Extract PDF] ✅ Text-based PDF');
      return NextResponse.json({ text, method: 'text' });
    }

    // Step 2: Image-based PDF - Convert to images and OCR
    console.log('[Extract PDF] Starting image OCR...');

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OCR requires OpenAI API key' },
        { status: 422 }
      );
    }

    try {
      const images = await pdfToImages(buffer);
      console.log(`[Extract PDF] ${images.length} images ready for OCR`);

      const ocrTexts: string[] = [];

      for (let i = 0; i < images.length; i++) {
        console.log(`[Extract PDF] OCR page ${i + 1}/${images.length}...`);

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract ALL text from this PDF page. Keep original language, formatting, and special characters. Output ONLY the text, nothing else. If blank, output "BLANK".',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: images[i],
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0,
        });

        const pageText = response.choices[0]?.message?.content?.trim() || '';

        if (pageText && pageText !== 'BLANK' && pageText.length > 5) {
          console.log(`[Extract PDF] ✅ Page ${i + 1}: ${pageText.length} chars`);
          ocrTexts.push(`--- Page ${i + 1} ---\n${pageText}`);
        }

        // Rate limit delay
        if (i < images.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      const fullText = ocrTexts.join('\n\n');

      if (fullText.length < 10) {
        return NextResponse.json(
          { error: 'No readable text found in PDF' },
          { status: 422 }
        );
      }

      console.log(`[Extract PDF] ✅ OCR complete: ${fullText.length} chars from ${ocrTexts.length} pages`);
      return NextResponse.json({ text: fullText, method: 'ocr', pages: ocrTexts.length });

    } catch (ocrError: any) {
      console.error('[Extract PDF] OCR error:', ocrError.message);

      // Return partial text if available
      if (text.length > 0) {
        return NextResponse.json({ text, method: 'partial' });
      }

      return NextResponse.json(
        { error: `OCR failed: ${ocrError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Extract PDF] Error:', error.message);
    return NextResponse.json(
      { error: `PDF processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}
