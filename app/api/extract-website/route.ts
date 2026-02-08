import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL. Please enter a valid http or https URL.' }, { status: 400 });
    }

    console.log(`[Extract Website] Fetching: ${url}`);

    // Fetch the webpage with a browser-like User-Agent
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page (HTTP ${response.status}). The website may be blocking automated access.` },
        { status: 422 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      if (contentType.includes('text/plain')) {
        const text = await response.text();
        if (text.length < 50) {
          return NextResponse.json({ error: 'Page contains too little text content.' }, { status: 422 });
        }
        return NextResponse.json({ text, title: parsedUrl.hostname });
      }
      return NextResponse.json(
        { error: 'URL does not point to a web page. Only HTML pages are supported.' },
        { status: 422 }
      );
    }

    const html = await response.text();
    console.log(`[Extract Website] HTML received: ${html.length} chars`);

    const $ = cheerio.load(html);

    // Extract title BEFORE any removals
    let title = $('title').first().text().trim() ||
                $('meta[property="og:title"]').attr('content')?.trim() ||
                $('h1').first().text().trim() ||
                parsedUrl.hostname;

    // SAFE APPROACH: Select content area FIRST, then clean WITHIN it.
    // Global class-based removals like [class*="header"] can destroy entire pages
    // (e.g., Wikipedia's <html> has "header" in its class list).
    
    // Only remove truly safe global elements (scripts/styles are never content)
    $('script, style, noscript, iframe, svg, canvas, video, audio').remove();

    // Find the main content area (most specific first)
    let contentElement = $('article').first();
    
    if (!contentElement.length || contentElement.text().trim().length < 100) {
      // Wikipedia: use #mw-content-text (not .mw-parser-output which can have empty duplicates)
      contentElement = $('#mw-content-text').first();
    }
    if (!contentElement.length || contentElement.text().trim().length < 100) {
      contentElement = $('main, [role="main"]').first();
    }
    if (!contentElement.length || contentElement.text().trim().length < 100) {
      contentElement = $('[class*="article-body"], [class*="post-content"], [class*="entry-content"], [class*="story-body"]').first();
    }
    if (!contentElement.length || contentElement.text().trim().length < 100) {
      contentElement = $('#content, .post, .article').first();
    }
    if (!contentElement.length || contentElement.text().trim().length < 100) {
      contentElement = $('body');
    }

    // Now remove junk ONLY WITHIN the selected content area (safe)
    contentElement.find('nav, footer, [role="navigation"]').remove();
    contentElement.find('.navbox, .catlinks, .printfooter, .authority-control').remove();
    contentElement.find('.reflist, .references, .mw-references-wrap').remove();
    contentElement.find('.sistersitebox, .portal-bar, .noprint').remove();
    contentElement.find('.mw-editsection, .mw-jump-link').remove();
    contentElement.find('.infobox, .sidebar, .toc, .mw-table-of-contents').remove();
    contentElement.find('[class*="navbar"], [class*="advertisement"], [class*="advert"]').remove();
    contentElement.find('[class*="cookie"], [class*="popup"], [class*="banner"]').remove();
    contentElement.find('[class*="social-share"], [class*="share-buttons"]').remove();
    contentElement.find('table.ambox, .hatnote, .shortdescription').remove();
    // Wikipedia language links and interwiki
    contentElement.find('.interlanguage-link, #p-lang, .mw-portlet-lang').remove();
    contentElement.find('.vector-menu, .vector-dropdown').remove();

    // Extract text with structure preserved
    const extractedParts: string[] = [];
    const seen = new Set<string>();

    contentElement.find('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, figcaption, dt, dd').each((_i, el) => {
      const tagName = (el as any).tagName?.toLowerCase() || '';
      let text = $(el).text().trim();
      
      if (!text || text.length < 3) return;

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
      
      // Skip duplicates (nested elements can produce the same text)
      const textKey = text.substring(0, 100);
      if (seen.has(textKey)) return;
      seen.add(textKey);

      if (tagName.startsWith('h')) {
        const level = parseInt(tagName[1]);
        const prefix = '#'.repeat(level);
        extractedParts.push(`\n${prefix} ${text}\n`);
      } else if (tagName === 'li') {
        extractedParts.push(`• ${text}`);
      } else if (tagName === 'blockquote') {
        extractedParts.push(`> ${text}`);
      } else {
        extractedParts.push(text);
      }
    });

    let fullText = extractedParts.join('\n').trim();

    // If structured extraction got very little, fall back to raw text
    if (fullText.length < 100) {
      fullText = contentElement.text()
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Clean up the text
    fullText = fullText
      .replace(/\[edit\]/gi, '')
      .replace(/\[citation needed\]/gi, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`[Extract Website] Extracted ${fullText.length} chars from ${url}`);
    console.log(`[Extract Website] Title: ${title}`);
    console.log(`[Extract Website] Preview: ${fullText.substring(0, 200)}`);

    if (!fullText || fullText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from this page. The content may be loaded dynamically (JavaScript-rendered) and not available for extraction.' },
        { status: 422 }
      );
    }

    // Truncate if extremely long
    const maxLength = 50000;
    if (fullText.length > maxLength) {
      fullText = fullText.substring(0, maxLength) + '\n\n[Content truncated - extracted first ' + maxLength + ' characters]';
    }

    return NextResponse.json({
      text: fullText,
      title: title,
      url: url,
      charCount: fullText.length,
    });

  } catch (error: any) {
    console.error('[Extract Website] Error:', error?.message);
    
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'The website took too long to respond. Please try again or try a different URL.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to extract content from this URL. The website may be blocking automated access.' },
      { status: 500 }
    );
  }
}
