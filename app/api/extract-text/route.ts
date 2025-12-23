export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import Tesseract from "tesseract.js";
import mammoth from "mammoth";
import {
  validateExtractedText,
  cleanText,
  getFileType,
  isSupportedFileType,
  getTextStats,
  detectLanguage,
  ExtractionResult
} from "../../utils/textExtraction";

/**
 * ROBUST FILE-TO-TEXT EXTRACTION PIPELINE
 * 
 * Flow:
 * 1. User uploads file or link
 * 2. Backend ingestion service (this route)
 * 3. Text extraction (multiple strategies)
 * 4. Validation & cleanup
 * 5. Language detection
 * 6. Return structured result for AI generation
 */

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const youtubeUrl = formData.get("youtubeUrl") as string | null;

    // ===========================================
    // STRATEGY 1: YouTube Video Transcript
    // ===========================================
    if (youtubeUrl) {
      try {
        // Validate YouTube URL format
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
        if (!youtubeRegex.test(youtubeUrl)) {
          return NextResponse.json(
            { error: "Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link." },
            { status: 400 }
          );
        }

        console.log("📺 Extracting YouTube transcript...");
        const transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl);
        const rawText = transcript.map((item: { text: string }) => item.text).join(' ');
        
        // Validation
        const validation = validateExtractedText(rawText);
        if (!validation.valid) {
          return NextResponse.json(
            { error: `YouTube transcript validation failed: ${validation.reason}` },
            { status: 400 }
          );
        }

        // Cleanup
        const cleanedText = cleanText(rawText);
        const stats = getTextStats(cleanedText);
        const language = detectLanguage(cleanedText);

        console.log(`✅ YouTube extraction successful: ${stats.wordCount} words, ${language}`);

        return NextResponse.json({
          text: cleanedText,
          metadata: {
            fileType: 'youtube',
            wordCount: stats.wordCount,
            characterCount: stats.characterCount,
            language: language,
            extractionMethod: 'YouTube Transcript API'
          }
        });
      } catch (err: any) {
        console.error("❌ YOUTUBE TRANSCRIPT ERROR:", err);
        
        const errorMessage = err?.message || '';
        
        if (errorMessage.includes('Transcript is disabled') || errorMessage.includes('transcripts are disabled')) {
          return NextResponse.json(
            { error: "This video doesn't have captions yet. Try notes or PDFs instead." },
            { status: 400 }
          );
        }
        
        if (errorMessage.includes('Video unavailable') || errorMessage.includes('not available')) {
          return NextResponse.json(
            { error: "This video is unavailable or private. Please try a different video." },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: "Could not extract captions from this video. It may not have captions enabled, or the video might be unavailable." },
          { status: 400 }
        );
      }
    }

    // ===========================================
    // FILE VALIDATION
    // ===========================================
    if (!file) {
      return NextResponse.json(
        { error: "No file or URL provided" },
        { status: 400 }
      );
    }

    const fileType = getFileType(file);
    console.log(`📄 Processing file: ${file.name} (${fileType}, ${(file.size / 1024).toFixed(2)} KB)`);

    if (!isSupportedFileType(fileType)) {
      return NextResponse.json(
        { 
          error: `Unsupported file type: ${fileType}. Supported types: PDF, DOCX, TXT, PNG, JPG, GIF, BMP` 
        },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    let extractionMethod = "";
    const warnings: string[] = [];

    // ===========================================
    // STRATEGY 2: PDF Extraction
    // ===========================================
    if (fileType === 'pdf') {
      try {
        console.log("📑 Extracting from PDF...");
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        extractedText = data.text;
        extractionMethod = "PDF Parser";

        if (data.numpages) {
          console.log(`📄 PDF has ${data.numpages} pages`);
        }

        // If PDF text extraction yields poor results, suggest OCR
        if (extractedText.trim().length < 100 && data.numpages > 0) {
          warnings.push("PDF appears to be scanned or image-based. Text extraction may be incomplete. Try converting to images for better results.");
        }
      } catch (pdfError) {
        console.error("❌ PDF extraction failed:", pdfError);
        return NextResponse.json(
          { error: "Failed to extract text from PDF. The file may be corrupted or image-based." },
          { status: 400 }
        );
      }
    }

    // ===========================================
    // STRATEGY 3: DOCX Extraction (with images)
    // ===========================================
    else if (fileType === 'docx' || fileType === 'doc') {
      try {
        console.log("📝 Extracting from DOCX...");
        
        // Extract text
        const textResult = await mammoth.extractRawText({ buffer });
        extractedText = textResult.value;
        
        // Try to count images in the document
        try {
          const htmlResult = await mammoth.convertToHtml({ buffer });
          const imageMatches = htmlResult.value.match(/<img/g);
          const imageCount = imageMatches ? imageMatches.length : 0;
          
          if (imageCount > 0) {
            warnings.push(`Found ${imageCount} image(s) in document. To extract text from images, save them separately and upload as image files.`);
            console.log(`🖼️ Found ${imageCount} images in DOCX`);
          }
        } catch (imgError) {
          console.log("📝 Could not detect images in DOCX");
        }
        
        extractionMethod = "Mammoth DOCX Parser";

        if (textResult.messages && textResult.messages.length > 0) {
          console.log("⚠️ DOCX extraction warnings:", textResult.messages);
        }
      } catch (docxError) {
        console.error("❌ DOCX extraction failed:", docxError);
        return NextResponse.json(
          { error: "Failed to extract text from DOCX. The file may be corrupted." },
          { status: 400 }
        );
      }
    }

    // ===========================================
    // STRATEGY 4: Plain Text
    // ===========================================
    else if (fileType === 'txt') {
      try {
        console.log("📄 Reading plain text file...");
        extractedText = buffer.toString('utf-8');
        extractionMethod = "Plain Text Reader";
      } catch (txtError) {
        console.error("❌ Text file read failed:", txtError);
        return NextResponse.json(
          { error: "Failed to read text file. Check file encoding." },
          { status: 400 }
        );
      }
    }

    // ===========================================
    // STRATEGY 5: Image OCR (Tesseract)
    // ===========================================
    else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'image'].includes(fileType)) {
      try {
        console.log("🖼️ Performing OCR on image...");
        warnings.push("OCR processing may take 10-30 seconds depending on image quality.");

        const result = await Tesseract.recognize(buffer, 'eng+nor', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });

        extractedText = result.data.text;
        extractionMethod = "Tesseract OCR";

        // OCR confidence check
        if (result.data.confidence < 60) {
          warnings.push("Low OCR confidence. Image quality may be poor. Consider using a clearer image.");
        }

        console.log(`✅ OCR complete. Confidence: ${result.data.confidence.toFixed(1)}%`);
      } catch (ocrError) {
        console.error("❌ OCR failed:", ocrError);
        return NextResponse.json(
          { error: "Failed to perform OCR on image. The image may be too complex or low quality." },
          { status: 400 }
        );
      }
    }

    // ===========================================
    // VALIDATION & CLEANUP
    // ===========================================
    console.log("🧹 Validating and cleaning text...");

    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: `Text extraction validation failed: ${validation.reason}`,
          suggestion: "The file may be empty, corrupted, or contain non-text content. Try a different file."
        },
        { status: 400 }
      );
    }

    const cleanedText = cleanText(extractedText);

    // ===========================================
    // LANGUAGE DETECTION & METADATA
    // ===========================================
    console.log("🌍 Detecting language...");
    const language = detectLanguage(cleanedText);
    const stats = getTextStats(cleanedText);

    console.log(`✅ Extraction complete: ${stats.wordCount} words, ${language}, via ${extractionMethod}`);

    // ===========================================
    // RETURN STRUCTURED RESULT
    // ===========================================
    return NextResponse.json({
      text: cleanedText,
      metadata: {
        fileType: fileType,
        fileName: file.name,
        fileSize: file.size,
        wordCount: stats.wordCount,
        characterCount: stats.characterCount,
        sentenceCount: stats.sentenceCount,
        language: language,
        extractionMethod: extractionMethod
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (err: any) {
    console.error("❌ TEXT EXTRACTION ERROR:", err);
    return NextResponse.json(
      { 
        error: "Failed to extract text from file",
        details: err.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
