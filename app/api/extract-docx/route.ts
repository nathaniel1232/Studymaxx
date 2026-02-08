import { NextRequest, NextResponse } from 'next/server';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mammothModule: any = await import('mammoth');
    const mammoth = mammothModule.default || mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from this document.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('[Extract DOCX] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to extract text from DOCX. The file may be corrupted.' },
      { status: 500 }
    );
  }
}
