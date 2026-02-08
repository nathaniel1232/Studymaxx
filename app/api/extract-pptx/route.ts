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

    // PPTX files are ZIP archives containing XML slides
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZip: any = (await import('jszip')).default || (await import('jszip'));
    const zip = await JSZip.loadAsync(buffer);

    const slideTexts: string[] = [];

    // Get all slide XML files (ppt/slides/slide1.xml, slide2.xml, etc.)
    const slideFiles = Object.keys(zip.files)
      .filter((name: string) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    if (slideFiles.length === 0) {
      return NextResponse.json(
        { error: 'No slides found in this PowerPoint file. It may be corrupted.' },
        { status: 422 }
      );
    }

    for (const slideFile of slideFiles) {
      const xmlContent = await zip.files[slideFile].async('string');
      
      // Extract text from XML — find all <a:t> tags (text content in OOXML)
      const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      if (textMatches) {
        const slideText = textMatches
          .map((match: string) => {
            const text = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
            return text.trim();
          })
          .filter((t: string) => t.length > 0)
          .join(' ');
        
        if (slideText.trim()) {
          slideTexts.push(slideText);
        }
      }
    }

    // Also try to extract from notes slides
    const notesFiles = Object.keys(zip.files)
      .filter((name: string) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name));

    for (const notesFile of notesFiles) {
      const xmlContent = await zip.files[notesFile].async('string');
      const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      if (textMatches) {
        const notesText = textMatches
          .map((match: string) => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
          .filter((t: string) => t.length > 0 && !t.match(/^\d+$/)) // Skip page numbers
          .join(' ');
        
        if (notesText.trim()) {
          slideTexts.push('[Notes] ' + notesText);
        }
      }
    }

    const fullText = slideTexts.join('\n\n');

    if (!fullText || fullText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from this PowerPoint. It may contain only images.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: fullText });
  } catch (error: any) {
    console.error('[Extract PPTX] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to extract text from PowerPoint file. The file may be corrupted.' },
      { status: 500 }
    );
  }
}
