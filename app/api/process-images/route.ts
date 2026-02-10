export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { supabase } from "@/app/utils/supabase";

/**
 * MULTI-IMAGE OCR PROCESSING ENDPOINT
 * 
 * Purpose: Process multiple images in ONE request
 * - ONLY accepts image files (png, jpg, jpeg, gif, bmp)
 * - Enforces premium limits server-side
 * - Processes all images sequentially
 * - Returns combined text from all images
 * 
 * Flow:
 * 1. Validate user is authenticated
 * 2. Check premium status from database
 * 3. Enforce limits: Free=1 image, Premium=5 images
 * 4. Validate all files are images
 * 5. Run OCR on each image (Tesseract)
 * 6. Combine extracted text
 * 7. Return combined result
 */

// Limits
const MAX_IMAGES_FREE = 3;
const MAX_IMAGES_PREMIUM = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/webp'
];

export async function POST(req: Request) {
  try {
    // ===========================================
    // AUTHENTICATE USER (SESSION-BASED)
    // ===========================================
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get session from Authorization header
    const authHeader = req.headers.get('authorization');
    let session = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        session = { user };
      }
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to upload images." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log(`[process-images] Authenticated user: ${userId}`);

    // ===========================================
    // CHECK PREMIUM STATUS (SERVER-SIDE)
    // ===========================================
    let isPremium = false;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[process-images] Failed to fetch user premium status:', error);
        return NextResponse.json(
          { error: "Failed to verify account status. Please try again." },
          { status: 500 }
        );
      }

      isPremium = userData?.is_premium || false;
    } catch (error) {
      console.error('[process-images] Premium check exception:', error);
      return NextResponse.json(
        { error: "Failed to verify account status. Please try again." },
        { status: 500 }
      );
    }

    console.log(`[process-images] User ${userId} | Premium: ${isPremium}`);

    // ===========================================
    // GET ALL IMAGES FROM FORMDATA
    // ===========================================
    const formData = await req.formData();
    const images = formData.getAll("images") as File[];
    
    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided. Please select at least one image." },
        { status: 400 }
      );
    }

    console.log(`[process-images] Received ${images.length} file(s)`);

    // ===========================================
    // ENFORCE LIMITS (SERVER-SIDE PROTECTION)
    // ===========================================
    const maxAllowed = isPremium ? MAX_IMAGES_PREMIUM : MAX_IMAGES_FREE;
    
    if (images.length > maxAllowed) {
      return NextResponse.json(
        { 
          error: isPremium 
            ? `Premium users can upload up to ${MAX_IMAGES_PREMIUM} images at once. You uploaded ${images.length}.`
            : `Free users can upload 1 image at a time. Upgrade to Premium to upload up to ${MAX_IMAGES_PREMIUM} images at once.`,
          premiumRequired: !isPremium,
          limit: maxAllowed,
          uploaded: images.length
        },
        { status: 403 }
      );
    }

    // ===========================================
    // VALIDATE: IMAGES ONLY
    // ===========================================
    const invalidFiles: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      
      // Check file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name} (${file.type})`);
      }
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Image "${file.name}" is too large. Maximum size is 10MB per image.` },
          { status: 400 }
        );
      }
    }

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { 
          error: `Only image files are allowed. Invalid files: ${invalidFiles.join(', ')}`,
          invalidFiles: invalidFiles,
          allowedTypes: 'PNG, JPG, JPEG, GIF, BMP, WEBP'
        },
        { status: 400 }
      );
    }

    // ===========================================
    // PROCESS ALL IMAGES (OCR)
    // ===========================================
    console.log(`[process-images] Processing ${images.length} image(s)...`);
    
    const results: Array<{
      fileName: string;
      text: string;
      confidence: number;
      characterCount: number;
    }> = [];
    
    const errors: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`[process-images] OCR ${i + 1}/${images.length}: ${image.name}`);
      
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        
        // Run Tesseract OCR
        const result = await Tesseract.recognize(buffer, 'eng+nor', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`  [OCR ${i + 1}] Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });

        const extractedText = result.data.text.trim();
        
        if (!extractedText || extractedText.length < 10) {
          errors.push(`${image.name}: No readable text found`);
          continue;
        }

        results.push({
          fileName: image.name,
          text: extractedText,
          confidence: result.data.confidence,
          characterCount: extractedText.length
        });

        console.log(`  [OCR ${i + 1}] ✅ Extracted ${extractedText.length} chars (confidence: ${result.data.confidence.toFixed(1)}%)`);
        
      } catch (ocrError) {
        console.error(`[process-images] OCR failed for ${image.name}:`, ocrError);
        errors.push(`${image.name}: OCR processing failed`);
      }
    }

    // ===========================================
    // VALIDATE RESULTS
    // ===========================================
    if (results.length === 0) {
      return NextResponse.json(
        { 
          error: "No text could be extracted from any images. Please ensure images contain readable text.",
          details: errors.length > 0 ? errors : undefined
        },
        { status: 400 }
      );
    }

    // ===========================================
    // COMBINE TEXT FROM ALL IMAGES
    // ===========================================
    const combinedText = results
      .map((result, index) => {
        return `--- Image ${index + 1}: ${result.fileName} ---\n${result.text}`;
      })
      .join('\n\n');

    const totalCharacters = results.reduce((sum, r) => sum + r.characterCount, 0);
    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    console.log(`[process-images] ✅ Combined text from ${results.length} image(s): ${totalCharacters} total characters`);

    // ===========================================
    // RETURN COMBINED RESULT
    // ===========================================
    return NextResponse.json({
      success: true,
      text: combinedText,
      metadata: {
        imagesProcessed: results.length,
        imagesFailed: errors.length,
        totalCharacters: totalCharacters,
        averageConfidence: averageConfidence,
        isPremium: isPremium,
        details: results.map(r => ({
          fileName: r.fileName,
          characterCount: r.characterCount,
          confidence: r.confidence
        }))
      },
      warnings: errors.length > 0 ? errors : undefined
    });

  } catch (err: any) {
    console.error("[process-images] ❌ ERROR:", err);
    return NextResponse.json(
      { 
        error: "Failed to process images",
        details: err.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
