import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

export const maxDuration = 120;

let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI | null {
  if (vertexAI) return vertexAI;
  if (!process.env.VERTEX_AI_PROJECT_ID) return null;
  try {
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credJson && credJson.startsWith('{')) {
      const creds = JSON.parse(credJson);
      vertexAI = new VertexAI({
        project: process.env.VERTEX_AI_PROJECT_ID,
        location: 'us-central1',
        googleAuthOptions: { credentials: creds },
      });
    } else {
      vertexAI = new VertexAI({
        project: process.env.VERTEX_AI_PROJECT_ID,
        location: 'us-central1',
      });
    }
    return vertexAI;
  } catch (e: any) {
    console.error('[Extract PDF] Vertex AI init failed:', e.message);
    return null;
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

    // If we got meaningful text, return it
    if (text.length >= 10) {
      console.log('[Extract PDF] ✅ Text-based PDF extracted successfully');
      return NextResponse.json({ text, method: 'text' });
    }

    // Step 2: Use Gemini AI to read the PDF directly
    // Handles scanned PDFs, image-based PDFs, and PDFs with complex font encodings
    console.log('[Extract PDF] pdf-parse got insufficient text, trying Gemini AI...');

    if (buffer.length > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF too large (max 20MB). Please split into smaller files.' },
        { status: 400 }
      );
    }

    const ai = getVertexAI();
    if (!ai) {
      console.error('[Extract PDF] Vertex AI not configured');
      if (text.length > 0) {
        return NextResponse.json({ text, method: 'partial' });
      }
      return NextResponse.json(
        { error: 'Could not extract text from this PDF. Please try pasting the text manually.' },
        { status: 500 }
      );
    }

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const base64Pdf = buffer.toString('base64');
      console.log(`[Extract PDF] Sending ${(base64Pdf.length / 1024).toFixed(0)} KB to Gemini...`);

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              text: 'Extract ALL text content from this PDF document. Rules:\n- Keep the original language exactly as written\n- Preserve paragraph structure with line breaks\n- Include all headings, bullet points, numbered lists\n- Include any text in tables or figures\n- Do NOT add commentary, page numbers, or labels like "Page 1:"\n- Do NOT say "Here is the text:" or similar\n- Output ONLY the raw extracted text\n- If a page is blank, skip it',
            },
          ],
        }],
      });

      const extractedText = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      if (extractedText.length < 10) {
        return NextResponse.json(
          { error: 'No readable text found in this PDF. The file may be empty or corrupted.' },
          { status: 422 }
        );
      }

      console.log(`[Extract PDF] ✅ Gemini extracted ${extractedText.length} chars`);
      return NextResponse.json({ text: extractedText, method: 'gemini' });

    } catch (geminiError: any) {
      console.error('[Extract PDF] Gemini extraction failed:', geminiError.message);
      if (text.length > 0) {
        return NextResponse.json({ text, method: 'partial' });
      }
      return NextResponse.json(
        { error: 'Failed to read this PDF. Please try a different file or paste the text manually.' },
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
