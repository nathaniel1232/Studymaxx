export const runtime = "nodejs";

import { NextResponse } from "next/server";
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
import { supabase } from "@/app/utils/supabase";
import { canUseFeature } from "@/app/utils/premium";

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
    const userId = formData.get("userId") as string | null;

    // Check premium status
    let isPremium = false;
    if (userId && supabase) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', userId)
          .single();

        isPremium = userData?.is_premium || false;
      } catch (error) {
        console.error('Failed to fetch user premium status:', error);
      }
    }

    // ===========================================
    // STRATEGY 1: YouTube Video Transcript
    // ===========================================
    if (youtubeUrl) {
      // Check if user can use YouTube feature
      const youtubeCheck = canUseFeature('youtube', isPremium);
      if (!youtubeCheck.allowed) {
        return NextResponse.json(
          { 
            error: youtubeCheck.reason,
            premiumRequired: true,
            featureType: 'youtube'
          },
          { status: 403 }
        );
      }

      // YouTube transcripts must be fetched from client-side due to YouTube's bot protection
      // The client will send us the transcript text directly
      return NextResponse.json(
        { 
          error: "YouTube transcript extraction must be done from browser. Please use the client-side handler.",
          requiresClientSide: true
        },
        { status: 400 }
      );
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
      // Check if user can upload PDFs
      const pdfCheck = canUseFeature('pdf', isPremium);
      if (!pdfCheck.allowed) {
        return NextResponse.json(
          { 
            error: pdfCheck.reason,
            premiumRequired: true,
            featureType: 'pdf'
          },
          { status: 403 }
        );
      }

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
      // Check if user can upload images
      const imageCheck = canUseFeature('image', isPremium);
      if (!imageCheck.allowed) {
        return NextResponse.json(
          { 
            error: imageCheck.reason,
            premiumRequired: true,
            featureType: 'image'
          },
          { status: 403 }
        );
      }

      try {
        console.log("🖼️ Performing OCR on image...");
        warnings.push("OCR processing may take 10-20 seconds depending on image quality.");

        // Use comprehensive language set for better recognition
        // eng+nor+swe+dan+deu+fra+spa covers most European languages
        const result = await Tesseract.recognize(buffer, 'eng+nor+swe+dan+deu+fra+spa', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          preserve_interword_spaces: '1',
        });

        extractedText = result.data.text;
        extractionMethod = "Tesseract OCR (Multi-language)";
        
        console.log(`📊 OCR Stats: ${extractedText.length} chars, ${result.data.confidence.toFixed(1)}% confidence`);

        // OCR confidence check
        if (result.data.confidence < 50) {
          warnings.push("Low OCR confidence. Image quality may be poor. Consider using a clearer image or higher resolution.");
        } else if (result.data.confidence < 70) {
          warnings.push("Moderate OCR confidence. Some text may be inaccurate.");
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
