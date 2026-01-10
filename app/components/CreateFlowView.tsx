"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { generateFlashcards } from "../utils/flashcardGenerator";
import { Flashcard, getOrCreateUserId, getSavedFlashcardSets } from "../utils/storage";
import { getStudyFact } from "../utils/studyFacts";
import { checkAIRateLimit, incrementAIUsage, getRemainingGenerations } from "../utils/aiRateLimit";
import { useTranslation, useSettings } from "../contexts/SettingsContext";
import { getCurrentUser, supabase } from "../utils/supabase";
import ArrowIcon from "./icons/ArrowIcon";
import PremiumModal from "./PremiumModal";
import { messages } from "../utils/messages";

interface CreateFlowViewProps {
  onGenerateFlashcards: (cards: Flashcard[], subject: string, grade: string) => void;
  onBack: () => void;
  onRequestLogin?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type MaterialType = "notes" | "pdf" | "youtube" | "image" | "docx" | null;
type Grade = "A" | "B" | "C" | "D" | "E";

export default function CreateFlowView({ onGenerateFlashcards, onBack, onRequestLogin }: CreateFlowViewProps) {
  const t = useTranslation();
  const { settings } = useSettings();
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: Subject
  const [subject, setSubject] = useState("");
  
  // Step 2: Material
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(null);
  const [textInput, setTextInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  
  // Math mode (only for math subjects)
  const [includeMathProblems, setIncludeMathProblems] = useState(false);
  
  // Step 3: Grade
  const [targetGrade, setTargetGrade] = useState<Grade | null>(null);
  
  // Step 4: Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [error, setError] = useState("");
  
  // Premium state
  const [isPremium, setIsPremium] = useState(false);
  const [setsCreated, setSetsCreated] = useState(0);
  const [canCreateMore, setCanCreateMore] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDailyLimit, setIsDailyLimit] = useState(false);
  const [premiumCheckLoading, setPremiumCheckLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

  // Check premium status on mount AND when session changes
  useEffect(() => {
    // Add a small delay to ensure session is fully initialized
    const timer = setTimeout(() => {
      checkPremiumStatus();
    }, 50);
    
    // Listen for auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[CreateFlowView] Auth state changed:', event, 'Has session:', !!session);
        setHasSession(!!session);
        if (session) {
          // Add delay before checking premium to allow session to fully sync
          setTimeout(() => checkPremiumStatus(), 100);
        } else {
          setIsPremium(false);
          setPremiumCheckLoading(false);
        }
      });
      
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Timer effect for generation progress
  useEffect(() => {
    if (!isGenerating || generationStartTime === 0) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isGenerating, generationStartTime]);

  // Message rotation effect - rotate every 8 seconds (longer for readability)
  useEffect(() => {
    if (!isGenerating) {
      setCurrentMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % 3);
    }, 8000); // Increased from 5000ms to 8000ms so users can read the quick tip
    
    return () => clearInterval(interval);
  }, [isGenerating]);

  const checkPremiumStatus = async () => {
    console.log('[CreateFlowView] ===== STARTING PREMIUM CHECK =====');
    try {
      if (!supabase) {
        console.log('[CreateFlowView] Supabase not configured');
        setIsPremium(false);
        setPremiumCheckLoading(false);
        return;
      }

      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[CreateFlowView] Session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError
      });
      
      if (sessionError || !session) {
        console.log('[CreateFlowView] ❌ No session found - user not logged in');
        setIsPremium(false);
        setPremiumCheckLoading(false);
        return;
      }

      // Call the API with the auth token
      const response = await fetch('/api/premium/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CreateFlowView] ✅ Premium status received:', data);
        console.log('[CreateFlowView] 🎯 Setting isPremium to:', data.isPremium);
        setIsPremium(data.isPremium);
        setSetsCreated(data.setsCreated);
        setCanCreateMore(data.canCreateMore);
        
        // Update remaining generations
        const remaining = getRemainingGenerations(session?.user?.id || '', data.isPremium);
        setRemainingGenerations(parseInt(remaining) || 3);
        
        console.log('[CreateFlowView] ===== PREMIUM CHECK COMPLETE ===== isPremium:', data.isPremium);
      } else if (response.status === 401) {
        console.log('[CreateFlowView] ❌ User not authenticated - treating as free user');
        setIsPremium(false);
        const remaining = getRemainingGenerations('', false);
        setRemainingGenerations(parseInt(remaining) || 3);
      } else {
        console.log('[CreateFlowView] ❌ Premium check API failed:', response.status);
        // Fallback to localStorage count
        const userId = getOrCreateUserId();
        const savedSets = await getSavedFlashcardSets();
        const userSets = savedSets.filter(set => set.userId === userId);
        setSetsCreated(userSets.length);
        const remaining = getRemainingGenerations(userId, false);
        setRemainingGenerations(parseInt(remaining) || 3);
        setCanCreateMore(userSets.length < 3);
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Premium check failed:', error);
      // Fallback to localStorage count
      const userId = getOrCreateUserId();
      const savedSets = await getSavedFlashcardSets();
      const userSets = savedSets.filter(set => set.userId === userId);
      setSetsCreated(userSets.length);
      setCanCreateMore(userSets.length < 3);
      setIsPremium(false);
    } finally {
      setPremiumCheckLoading(false);
    }
  };

  // Subject examples
  const getSubjectExamples = () => [
    { name: settings.language === "no" ? "Engelsk" : "English", emoji: "🇬🇧" },
    { name: settings.language === "no" ? "Matte" : "Math", emoji: "📐" },
    { name: settings.language === "no" ? "Biologi" : "Biology", emoji: "🧬" },
    { name: settings.language === "no" ? "Historie" : "History", emoji: "📜" },
    { name: settings.language === "no" ? "Naturfag" : "Chemistry", emoji: "⚗️" },
    { name: settings.language === "no" ? "Fysikk" : "Physics", emoji: "⚛️" }
  ];

  // Grade options with descriptions - adapts to selected grade system
  const getGradeOptions = (): { grade: Grade; label: string; description: string }[] => {
    if (settings.gradeSystem === "1-6") {
      return [
        { grade: "A", label: `6 — ${t("excellence")}`, description: t("master_every_detail") },
        { grade: "B", label: `5 — ${t("very_good")}`, description: t("strong_understanding") },
        { grade: "C", label: `4 — ${t("good")}`, description: t("solid_foundations") },
        { grade: "D", label: `3 — ${t("satisfactory")}`, description: t("core_concepts") },
        { grade: "E", label: `2 — ${t("passing")}`, description: t("essential_knowledge") }
      ];
    } else if (settings.gradeSystem === "percentage") {
      return [
        { grade: "A", label: `90-100% — ${t("excellence")}`, description: t("master_every_detail") },
        { grade: "B", label: `80-89% — ${t("very_good")}`, description: t("strong_understanding") },
        { grade: "C", label: `70-79% — ${t("good")}`, description: t("solid_foundations") },
        { grade: "D", label: `60-69% — ${t("satisfactory")}`, description: t("core_concepts") },
        { grade: "E", label: `50-59% — ${t("passing")}`, description: t("essential_knowledge") }
      ];
    } else {
      // Default A-F system
      return [
        { grade: "A", label: `A — ${t("excellence")}`, description: t("master_every_detail") },
        { grade: "B", label: `B — ${t("very_good")}`, description: t("strong_understanding") },
        { grade: "C", label: `C — ${t("good")}`, description: t("solid_foundations") },
        { grade: "D", label: `D — ${t("satisfactory")}`, description: t("core_concepts") },
        { grade: "E", label: `E — ${t("passing")}`, description: t("essential_knowledge") }
      ];
    }
  };

  // Check if subject is math-related
  const isMathSubject = () => {
    const mathKeywords = ['math', 'maths', 'mathematics', 'matte', 'matematikk', 'algebra', 'calculus', 'geometry', 'statistics'];
    return mathKeywords.some(keyword => subject.toLowerCase().includes(keyword));
  };

  // Map grade to difficulty settings
  const getGenerationSettings = (grade: Grade) => {
    // Free users can use up to 20 cards (C, D, E), Premium gets up to 30
    const maxCards = isPremium ? 30 : 20;
    
    const settings = {
      A: { cardCount: Math.min(30, maxCards), difficulty: "comprehensive", quizStrictness: "strict" },
      B: { cardCount: Math.min(25, maxCards), difficulty: "thorough", quizStrictness: "moderate" },
      C: { cardCount: Math.min(20, maxCards), difficulty: "standard", quizStrictness: "moderate" },
      D: { cardCount: Math.min(15, maxCards), difficulty: "focused", quizStrictness: "lenient" },
      E: { cardCount: Math.min(10, maxCards), difficulty: "essential", quizStrictness: "lenient" }
    };
    return settings[grade];
  };

  // Get actual card counts for display (not limited by premium status)
  const getActualCardCount = (grade: Grade) => {
    const counts = {
      A: 30,
      B: 25,
      C: 20,
      D: 15,
      E: 10
    };
    return counts[grade];
  };

  // Step navigation
  const handleContinueFromStep1 = () => {
    if (!subject.trim()) {
      setError(messages.errors.subjectRequired);
      return;
    }
    setError("");
    setCurrentStep(2);
  };

  const handleContinueFromStep2 = () => {
    if (!selectedMaterial) {
      setError(messages.errors.materialTypeRequired);
      return;
    }
    
    if (selectedMaterial === "notes" && !textInput.trim()) {
      setError(messages.errors.notesRequired);
      return;
    }
    
    if (selectedMaterial === "youtube" && !youtubeUrl.trim()) {
      setError(messages.errors.youtubeUrlRequired);
      return;
    }
    
    if ((selectedMaterial === "pdf" || selectedMaterial === "docx" || selectedMaterial === "image") && !uploadedFile) {
      setError(messages.errors.fileRequired);
      return;
    }
    
    setError("");
    setCurrentStep(3);
  };

  const handleContinueFromStep3 = () => {
    if (!targetGrade) {
      setError(messages.errors.gradeRequired);
      return;
    }
    
    // TEMPORARY: Skip Premium check - always allow
    console.log('[CreateFlowView] Continuing to generation (Premium check bypassed)');
    
    setError("");
    setCurrentStep(4);
    handleGenerate();
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep((prev) => (prev - 1) as Step);
      setError("");
    }
  };

  // Multi-image handling (Premium only)
  const handleMultiImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxImages = 5;
    
    if (files.length > maxImages) {
      setError(messages.errors.tooManyImages);
      return;
    }
    
    // Validate all are images
    const nonImages = files.filter(f => !f.type.startsWith('image/'));
    if (nonImages.length > 0) {
      setError(messages.errors.invalidFileType);
      return;
    }
    
    setSelectedImages(files);
    setError("");
  };

  const handleProcessImages = async () => {
    if (selectedImages.length === 0) return;
    
    console.log('[CreateFlow] Starting image processing...');
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);
    setIsGenerating(true);
    setError("");
    
    try {
      const Tesseract = await import("tesseract.js");
      const extractedTexts: string[] = [];
      
      console.log(`[CreateFlow] Processing ${selectedImages.length} images sequentially...`);
      
      // Process images one by one
      for (let i = 0; i < selectedImages.length; i++) {
        const imageFile = selectedImages[i];
        console.log(`[CreateFlow] Processing image ${i + 1}/${selectedImages.length}: ${imageFile.name}`);
        
        try {
          // Load image
          const imageUrl = URL.createObjectURL(imageFile);
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          
          console.log(`  [Image ${i + 1}] Original: ${img.width}x${img.height}px`);
          
          // ===== PREPROCESSING FOR BETTER OCR =====
          // 1. Upscale 2x - Tesseract works better with larger text (~300 DPI)
          const scale = 2;
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          
          const canvas = document.createElement('canvas');
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          
          // 2. Draw upscaled with smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
          
          // 3. Get image data for pixel manipulation
          const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
          const data = imageData.data;
          
          // 4. Convert to grayscale + enhance contrast
          // Grayscale: Removes color noise, Tesseract processes faster
          // Contrast: Makes text/background more distinct
          for (let j = 0; j < data.length; j += 4) {
            // Grayscale conversion (luminosity method)
            const gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
            
            // Contrast enhancement (simple method: stretch values)
            // This makes darks darker and lights lighter
            const contrast = 1.5; // Increase contrast
            const enhanced = ((gray - 128) * contrast) + 128;
            const clamped = Math.max(0, Math.min(255, enhanced));
            
            data[j] = data[j + 1] = data[j + 2] = clamped;
          }
          
          // 5. Put processed image back
          ctx.putImageData(imageData, 0, 0);
          
          console.log(`  [Image ${i + 1}] Preprocessed: ${scaledWidth}x${scaledHeight}px (2x upscale, grayscale, contrast)`);
          
          URL.revokeObjectURL(imageUrl);
          
          // ===== RUN OCR ON PREPROCESSED CANVAS =====
          console.log(`  [Image ${i + 1}] Starting OCR...`);
          const result = await Tesseract.recognize(canvas, 'nor+eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`  [Image ${i + 1}] ${m.status}: ${(m.progress * 100).toFixed(0)}%`);
              }
            }
          });
          
          const text = result.data.text.trim();
          const confidence = result.data.confidence;
          
          console.log(`[CreateFlow] ✅ Image ${i + 1} OCR completed:`);
          console.log(`  - Characters extracted: ${text.length}`);
          console.log(`  - Confidence: ${confidence.toFixed(1)}%`);
          
          // ===== CONFIDENCE WARNING =====
          if (confidence < 50) {
            console.warn(`  ⚠️ LOW CONFIDENCE (${confidence.toFixed(1)}%) - Text may be inaccurate`);
          }
          
          console.log(`  - Extracted text preview (first 300 chars):`);
          console.log(text.substring(0, 300));
          
          if (text.length > 10) {
            extractedTexts.push(`--- Image ${i + 1}: ${imageFile.name} ---\n${text}`);
          } else {
            console.warn(`[CreateFlow] ⚠️ Very little text found in image ${i + 1} (only ${text.length} chars)`);
            if (text.length > 0) {
              extractedTexts.push(`--- Image ${i + 1}: ${imageFile.name} ---\n${text}`);
            }
          }
        } catch (imgError) {
          console.error(`[CreateFlow] ❌ Failed to process image ${i + 1}:`, imgError);
        }
      }
      
      if (extractedTexts.length === 0) {
        throw new Error(messages.errors.imageProcessingFailed);
      }
      
      const combinedText = extractedTexts.join('\n\n');
      
      // Calculate average confidence
      const avgConfidence = extractedTexts.length > 0 ? 60 : 0; // Placeholder since we logged individual
      
      console.log(`[CreateFlow] ✅ All done!`);
      console.log(`  - Processed ${extractedTexts.length}/${selectedImages.length} images successfully`);
      console.log(`  - Total characters: ${combinedText.length}`);
      
      // Warn if overall quality seems poor
      if (combinedText.length < 100 && selectedImages.length > 1) {
        console.warn(`  ⚠️ Very little text extracted. Check if images contain readable text.`);
      }
      
      setTextInput(combinedText);
      setError("");
    } catch (err: any) {
      console.error('[CreateFlow] Error processing images:', err);
      setError(err.message || messages.errors.imageProcessingFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  // File handling (for PDF, DOCX, and single image with OCR)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError("");

    // For PDF, extract text client-side
    if (file.type === "application/pdf") {
      try {
        setError(""); // Clear any previous errors
        console.log("📑 Extracting PDF client-side...");
        
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        console.log("📑 PDF loaded, size:", arrayBuffer.byteLength);
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log("📑 PDF pages:", pdf.numPages);
        
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }
        
        const trimmedText = fullText.trim();
        console.log("📑 Extracted text length:", trimmedText.length);
        console.log("📑 First 200 chars:", trimmedText.substring(0, 200));
        
        if (trimmedText.length < 20) {
          setError(messages.errors.pdfProcessingFailed);
          return;
        }
        
        setTextInput(trimmedText);
        console.log("✅ PDF extraction successful");
      } catch (err: any) {
        console.error("❌ PDF extraction failed:", err);
        setError(messages.errors.pdfProcessingFailed);
      }
    } else if (file.type.startsWith("image/")) {
      // Handle image with OCR (simple single-image version)
      try {
        const Tesseract = await import("tesseract.js");
        const result = await Tesseract.recognize(file, "eng", {
          logger: (m) => console.log(m),
        });
        
        const extractedText = result.data.text;
        
        if (!extractedText || extractedText.trim().length === 0) {
          setError(t("no_text_image"));
          return;
        }
        
        setTextInput(extractedText);
      } catch (err) {
        setError("Failed to extract text from image. Please try another image.");
      }
    } else {
      // For DOCX, use the API
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to extract text");

        const data = await response.json();
        setTextInput(data.text || "");
      } catch (err) {
        setError("Failed to extract text from file. Please try another format.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!targetGrade) return;
    
    // Check if free user has hit study set limit - check ACTUAL saved sets, not just state
    if (!isPremium) {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || getOrCreateUserId();
      const savedSets = await getSavedFlashcardSets();
      const userSets = savedSets.filter(set => set.userId === userId);
      
      if (userSets.length >= 3) {
        setError("You've reached your limit of 3 free study sets. Upgrade to Premium for unlimited study sets!");
        setShowPremiumModal(true);
        return;
      }
    }
    
    // Wait for Premium check to complete if still loading
    if (premiumCheckLoading) {
      console.log('[CreateFlowView] Waiting for Premium check...');
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!premiumCheckLoading) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 100);
      });
    }
    
    // Check rate limit BEFORE generating
    const currentUser = await getCurrentUser();
    const userId = currentUser?.id || null;
    console.log('[CreateFlowView] ========================================');
    console.log('[CreateFlowView] 🔍 RATE LIMIT CHECK');
    console.log('[CreateFlowView] isPremium:', isPremium);
    console.log('[CreateFlowView] userId:', userId);
    console.log('[CreateFlowView] premiumCheckLoading:', premiumCheckLoading);
    console.log('[CreateFlowView] ========================================');
    const rateLimit = checkAIRateLimit(userId, isPremium);
    console.log('[CreateFlowView] Rate limit result:', rateLimit);
    
    if (!rateLimit.allowed) {
      // TEMPORARY: Bypass rate limit for Premium
      console.log('[CreateFlowView] ⚠️ Rate limit would block, but bypassing for Premium test');
    }
    
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);
    setIsGenerating(true);
    setError("");

    try {
      const settings = getGenerationSettings(targetGrade);
      
      // Prepare the text to send
      let textToProcess = "";
      
      console.log('[CreateFlowView] 📝 Preparing text for generation...');
      console.log('[CreateFlowView] selectedMaterial:', selectedMaterial);
      console.log('[CreateFlowView] textInput length:', textInput.length);
      console.log('[CreateFlowView] textInput preview:', textInput.substring(0, 200));
      
      if (selectedMaterial === "notes" || selectedMaterial === "image") {
        textToProcess = textInput;
        console.log('[CreateFlowView] Using textInput directly');
      } else if (selectedMaterial === "youtube") {
        // Extract from YouTube client-side (YouTube blocks server requests)
        try {
          const { fetchYouTubeTranscript } = await import('../utils/youtubeTranscript');
          textToProcess = await fetchYouTubeTranscript(youtubeUrl);
          
          if (!textToProcess || textToProcess.trim().length < 20) {
            throw new Error("Could not extract transcript or transcript is too short");
          }
        } catch (err: any) {
          throw new Error(err.message || "Failed to extract YouTube transcript. Make sure the video has captions enabled.");
        }
      } else if (selectedMaterial === "pdf" && textInput) {
        textToProcess = textInput;
      } else if (selectedMaterial === "docx" && textInput) {
        textToProcess = textInput;
      }

      if (!textToProcess.trim()) {
        throw new Error("No content to generate flashcards from");
      }

      console.log('[CreateFlowView] 🚀 About to generate flashcards with:');
      console.log('[CreateFlowView] - Text length:', textToProcess.length);
      console.log('[CreateFlowView] - Subject:', subject);
      console.log('[CreateFlowView] - Target grade:', targetGrade);
      console.log('[CreateFlowView] - Card count:', settings.cardCount);
      console.log('[CreateFlowView] - First 300 chars:', textToProcess.substring(0, 300));

      // Get userId for premium checks
      const userIdForGen = userId || getOrCreateUserId();

      // FINAL CHECK: Verify free user hasn't hit limit (double-check before generation)
      if (!isPremium) {
        const latestSets = await getSavedFlashcardSets();
        const latestUserSets = latestSets.filter(set => set.userId === userIdForGen);
        if (latestUserSets.length >= 3) {
          throw new Error("You've reached your limit of 3 free study sets. Upgrade to Premium for unlimited study sets!");
        }
      }

      // Generate flashcards with metadata
      const cards = await generateFlashcards(
        textToProcess,
        settings.cardCount,
        subject,
        targetGrade,
        userIdForGen,
        selectedMaterial || "notes"
      );

      // Increment rate limit counter AFTER successful generation
      if (userId && !isPremium) {
        incrementAIUsage(userId);
        // Update the display counter
        setRemainingGenerations(Math.max(0, remainingGenerations - 1));
      }

      onGenerateFlashcards(cards, subject, targetGrade);
      
      // Refresh premium status after successful generation
      await checkPremiumStatus();
    } catch (err: any) {
      // Handle premium-related errors
      if (err.message === "PREMIUM_REQUIRED" || err.message.includes("Upgrade to Premium")) {
        setIsDailyLimit(false);
        setShowPremiumModal(true);
        setIsGenerating(false);
        setCurrentStep(2); // Go back to material step
        return;
      }
      
      if (err.message === "DAILY_LIMIT_REACHED" || err.message.includes("daily")) {
        setError("You've reached your daily AI generation limit. Upgrade to Premium for unlimited generations!");
        setIsGenerating(false);
        setCurrentStep(2);
        setIsDailyLimit(true);
        setTimeout(() => setShowPremiumModal(true), 300);
        return;
      }

      setError(err.message || "Failed to generate flashcards");
      setIsGenerating(false);
      setCurrentStep(2); // Go back to material step
    }
  };

  return (
    <>
      <div className="min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header with progress */}
          <div className="mb-12">
          <button
            onClick={handleBack}
            className="btn btn-ghost mb-6 px-4 py-2 font-medium rounded-full flex items-center gap-2"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: step === currentStep ? '3rem' : '2rem',
                  background: step === currentStep 
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                    : step < currentStep
                    ? 'var(--success)'
                    : 'var(--border)'
                }}
              />
            ))}
          </div>

          <h1 className="text-page-title text-center" style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {t("create_study_set")}
          </h1>
        </div>

        {/* Main content card */}
        <div className="card-elevated p-12">
          {/* Error message */}
          {error && (
            <div className="mb-8 p-5 rounded-xl" style={{ 
              background: 'var(--error-light)',
              border: '1px solid var(--error)',
              color: 'var(--error)'
            }}>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* STEP 1: Choose Subject */}
          {currentStep === 1 && (
            <div className="space-y-8">
              {/* Show daily limit info for free users */}
              {!isPremium && hasSession && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    ⚡ You have <strong>{remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} left today</strong>. Upgrade to premium for unlimited.
                  </p>
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  {t("what_subject")}
                </h2>
                <p style={{ color: 'var(--foreground-muted)' }}>
                  {t("helps_create")}
                </p>
              </div>

              {/* Subject selection buttons */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t("choose_common")}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {getSubjectExamples().map((example) => (
                    <button
                      key={example.name}
                      onClick={() => {
                        setSubject(example.name);
                      }}
                      className={`group relative p-5 border-3 rounded-2xl font-bold transition-all duration-300 transform ${
                        subject === example.name
                          ? "border-blue-600 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl shadow-blue-500/50 scale-105 hover:scale-110"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:shadow-lg hover:scale-105"
                      }`}
                    >
                      <div className={`text-4xl mb-2 transition-all ${subject === example.name ? 'scale-110' : 'scale-100'}`}>{example.emoji}</div>
                      <div className={`text-sm font-bold tracking-wide ${subject === example.name ? 'text-white' : ''}`}>{example.name}</div>
                      {subject === example.name && (
                        <div className="absolute top-1 right-2 text-2xl animate-pulse">✓</div>
                      )}
                    </button>
                  ))}
                  
                  {/* Other button */}
                  <button
                    onClick={() => {
                      setSubject("Other");
                    }}
                    className={`group relative p-5 border-3 rounded-2xl font-bold transition-all duration-300 transform md:col-span-3 ${
                      subject === "Other"
                        ? "border-blue-600 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl shadow-blue-500/50 scale-105 hover:scale-110"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:shadow-lg hover:scale-105"
                    }`}
                  >
                    <div className={`text-4xl mb-2 transition-all ${subject === "Other" ? 'scale-110' : 'scale-100'}`}>➕</div>
                    <div className={`text-sm font-bold tracking-wide ${subject === "Other" ? 'text-white' : ''}`}>Other</div>
                    {subject === "Other" && (
                      <div className="absolute top-1 right-2 text-2xl animate-pulse">✓</div>
                    )}
                  </button>
                </div>
              </div>

              {/* Continue button */}
              <button
                onClick={handleContinueFromStep1}
                disabled={!subject.trim()}
                className="btn btn-primary w-full py-4 text-lg font-bold rounded-xl"
              >
                {t("continue")}
              </button>
            </div>
          )}

          {/* STEP 2: Add Learning Material */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("what_studying_from")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("add_material_for")} <span className="font-semibold text-gray-700 dark:text-gray-300">{subject}</span>
                </p>
              </div>

              {/* Material type selection */}
              {!selectedMaterial ? (
                <div className="grid grid-cols-1 gap-4">
                  {/* Notes - Recommended */}
                  <button
                    onClick={() => setSelectedMaterial("notes")}
                    className="card card-hover relative p-6 text-left"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%)',
                      border: '1px solid var(--primary)'
                    }}
                  >
                    <div className="absolute -top-3 right-4 text-xs font-bold px-4 py-1.5 rounded-full" style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                      color: 'var(--primary-foreground)',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      {t("recommended")}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">📝</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("notes")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          {t("paste_notes")}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* DOCX Files - Premium */}
                  <button
                    onClick={() => {
                      if (!isPremium) {
                        setShowPremiumModal(true);
                      } else {
                        setSelectedMaterial("docx");
                      }
                    }}
                    className="card card-hover p-6 text-left relative"
                  >
                    {!isPremium && (
                      <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Premium
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">📄</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("docx_document")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          Upload Word documents
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Image - Premium Only */}
                  <button
                    onClick={() => {
                      if (!isPremium) {
                        setShowPremiumModal(true);
                      } else {
                        setSelectedMaterial("image");
                      }
                    }}
                    className="card card-hover p-6 text-left relative"
                  >
                    {!isPremium && (
                      <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Premium
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🖼️</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("image")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          {t("upload_image_ocr")}
                        </p>
                      </div>
                    </div>
                  </button>

                </div>
              ) : (
                <>
                  {/* Material input area */}
                  <div className="space-y-4">
                    {/* Show selected type */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {selectedMaterial === "notes" && "📝"}
                          {selectedMaterial === "pdf" && "📄"}
                          {selectedMaterial === "youtube" && "📺"}
                          {selectedMaterial === "image" && "🖼️"}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedMaterial === "notes" && t("notes")}
                          {selectedMaterial === "pdf" && t("pdf_document")}
                          {selectedMaterial === "youtube" && t("youtube_video")}
                          {selectedMaterial === "image" && t("image")}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMaterial(null);
                          setTextInput("");
                          setYoutubeUrl("");
                          setUploadedFile(null);
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        {t("change")}
                      </button>
                    </div>

                    {/* Notes input */}
                    {selectedMaterial === "notes" && (
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={t("paste_notes_here")}
                        className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                        autoFocus
                      />
                    )}

                    {/* PDF upload */}
                    {selectedMaterial === "pdf" && (
                      <div>
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all bg-gray-50 dark:bg-gray-900/50"
                        >
                          {uploadedFile ? (
                            <div className="text-center">
                              <div className="text-4xl mb-2">✅</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("click_to_change")}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📤</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {t("click_to_upload")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("pdf_or_docx")}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}

                    {/* DOCX upload */}
                    {selectedMaterial === "docx" && (
                      <div>
                        <input
                          type="file"
                          id="docx-upload"
                          accept=".docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="docx-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all bg-gray-50 dark:bg-gray-900/50"
                        >
                          {uploadedFile ? (
                            <div className="text-center">
                              <div className="text-4xl mb-2">✅</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("click_to_change")}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📄</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {t("click_to_upload")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Word documents (.docx)
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}

                    {/* YouTube input */}
                    {selectedMaterial === "youtube" && (
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                        autoFocus
                      />
                    )}

                    {/* Image upload */}
                    {selectedMaterial === "image" && (
                      <div>
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all bg-gray-50 dark:bg-gray-900/50"
                        >
                          {uploadedFile ? (
                            <div className="text-center">
                              <div className="text-4xl mb-2">✅</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {textInput.length > 0 ? `${textInput.length} ${t("characters_extracted")}` : t("processing")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("click_to_change")}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📷</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {t("click_to_upload_image")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("jpg_png_formats")}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Continue button */}
                  <button
                    onClick={handleContinueFromStep2}
                    className="btn btn-primary w-full py-4 text-lg font-bold rounded-xl"
                  >
                    {t("continue")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Choose Grade */}
          {currentStep === 3 && (
            <div className="space-y-8">
              {/* Math mode selection (only for math subjects) */}
              {isMathSubject() && (
                <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    📐 {settings.language === "no" ? "Ekstra matematikkøvelse" : "Extra Math Practice"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {settings.language === "no" 
                      ? "Vil du ha regneoppgaver i tillegg til kunnskapskort?" 
                      : "Do you want calculation problems in addition to flashcards?"}
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeMathProblems}
                      onChange={(e) => setIncludeMathProblems(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {settings.language === "no" 
                        ? "Ja, inkluder regneoppgaver (anbefalt for matte)" 
                        : "Yes, include calculation problems (recommended for math)"}
                    </span>
                  </label>
                  {includeMathProblems && (
                    <p className="mt-3 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <span>💡</span>
                      <span>
                        {settings.language === "no"
                          ? "Flashcards vil fortsatt være inkludert for å hjelpe deg med teori og konsepter."
                          : "Flashcards will still be included to help you with theory and concepts."}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  {t("what_grade_aiming")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {t("create_right_amount")}
                </p>
              </div>

              {/* Grade options */}
              <div className="grid gap-4">
                {getGradeOptions().map(({ grade, label, description }) => {
                  const actualCardCount = getActualCardCount(grade);
                  const isLocked = !isPremium && actualCardCount > 20;
                  const gradeEmojis: Record<Grade, string> = {
                    'A': '🏆',
                    'B': '🎯', 
                    'C': '✅',
                    'D': '📚',
                    'E': '📖'
                  };
                  
                  return (
                    <button
                      key={grade}
                      onClick={() => {
                        if (isLocked) {
                          setShowPremiumModal(true);
                        } else {
                          setTargetGrade(grade);
                        }
                      }}
                      className={`w-full p-6 border-2 rounded-2xl text-left transition-all hover:scale-[1.01] hover:shadow-lg relative overflow-hidden group ${
                        targetGrade === grade
                          ? "border-blue-500 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 shadow-xl ring-4 ring-blue-200 dark:ring-blue-800"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                      } ${isLocked ? 'opacity-75' : ''}`}
                    >
                      {/* Background gradient effect */}
                      {targetGrade === grade && (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20 animate-pulse"></div>
                      )}
                      
                      {isLocked && (
                        <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex items-center gap-1">
                          <span>⭐</span>
                          <span>Premium</span>
                        </div>
                      )}
                      
                      <div className="relative flex items-start gap-4">
                        {/* Grade emoji/icon */}
                        <div className={`text-4xl transition-transform group-hover:scale-110 ${
                          targetGrade === grade ? 'animate-bounce' : ''
                        }`}>
                          {gradeEmojis[grade]}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`text-2xl font-bold ${
                              targetGrade === grade
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-900 dark:text-white"
                            }`}>
                              {label}
                            </div>
                            {targetGrade === grade && !isLocked && (
                              <div className="text-2xl text-green-500 animate-bounce">✓</div>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                            {description}
                          </div>
                          
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            targetGrade === grade
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}>
                            <span>📚</span>
                            <span>{actualCardCount} {t("flashcards") || "flashcards"}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Continue button */}
              <button
                onClick={handleContinueFromStep3}
                disabled={!targetGrade}
                className="btn btn-primary w-full py-4 text-lg font-bold rounded-xl"
              >
                {t("generate_study_set")}
              </button>
            </div>
          )}

          {/* STEP 4: Generating */}
          {currentStep === 4 && (
            <div className="py-12 text-center space-y-8">
              {/* Smooth animated spinner */}
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
                <div className="w-full h-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: '2.5s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
                  ✨
                </div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t("creating_study_set")}
                </h2>
                
                {/* Friendly reassurance message */}
                <div className="space-y-2">
                  <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                    {settings.language === "no" ? "Vi lager dine læringskort nå" : "We're creating your study cards"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {settings.language === "no" ? "Dette tar vanligvis 60-90 sekunder. Hang tight!" : "This usually takes 60-90 seconds. Hang tight!"}
                  </p>
                </div>
                
                {/* Real-time timer */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <span className="text-lg">⏱️</span>
                  <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                    {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Progress messages */}
              <div className="max-w-md mx-auto space-y-3">
                {/* Message 1: Reading material */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-500 ${
                  currentMessageIndex === 0
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 scale-105 shadow-md"
                    : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 opacity-40 scale-95"
                }`}>
                  <span className="text-2xl">📖</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{settings.language === "no" ? "Analyserer ditt material..." : "Reading your material..."}</span>
                </div>
                
                {/* Message 2: Creating cards */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-500 ${
                  currentMessageIndex === 1
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 scale-105 shadow-md"
                    : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 opacity-40 scale-95"
                }`}>
                  <span className="text-2xl">✍️</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{settings.language === "no" ? "Lager flashcards..." : "Creating flashcards..."}</span>
                </div>
                
                {/* Message 3: Setting up questions */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-500 ${
                  currentMessageIndex === 2
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 scale-105 shadow-md"
                    : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 opacity-40 scale-95"
                }`}>
                  <span className="text-2xl">🎯</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{settings.language === "no" ? "Setter opp spørsmål..." : "Setting up questions..."}</span>
                </div>
              </div>

              {/* Helpful study fact - subtle and encouraging */}
              <div className="max-w-lg mx-auto mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 font-medium flex items-center justify-center gap-1">
                  <span>💡</span>
                  <span>{settings.language === "no" ? "Mens du venter" : "Quick tip"}</span>
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  {getStudyFact("flashcards", settings.language).text}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal 
          isOpen={showPremiumModal}
          onClose={() => {
            setShowPremiumModal(false);
            setIsDailyLimit(false);
          }}
          setsCreated={setsCreated}
          isDailyLimit={isDailyLimit}
          onRequestLogin={onRequestLogin}
        />
      )}
    </>
  );
}
