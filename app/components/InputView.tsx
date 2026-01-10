"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { generateFlashcards } from "../utils/flashcardGenerator";
import { Flashcard } from "../utils/storage";
import { useTranslation } from "../contexts/SettingsContext";
import ArrowIcon from "./icons/ArrowIcon";
import { canUseFeature, FREE_LIMITS, getUserLimits } from "../utils/premium";
import PremiumModal from "./PremiumModal";
import { supabase } from "../utils/supabase";
import { messages } from "../utils/messages";

interface InputViewProps {
  onGenerateFlashcards: (cards: Flashcard[]) => void;
  onViewSavedSets: () => void;
  onBack?: () => void;
}

type MaterialType = "notes" | "pdf" | "youtube" | "image" | null;

export default function InputView({ onGenerateFlashcards, onViewSavedSets, onBack }: InputViewProps) {
  const t = useTranslation();
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(null);
  const [textInput, setTextInput] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalReason, setPremiumModalReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"processing" | "analyzing" | "generating" | "finalizing" | null>(null);
  const [error, setError] = useState("");
  
  // User controls
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [numberOfFlashcards, setNumberOfFlashcards] = useState(7);
  
  // Multiple files support (legacy for DOCX/PDF)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; text: string }[]>([]);
  
  // Multi-image upload (NEW - images only)
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageProcessingProgress, setImageProcessingProgress] = useState<string>("");
  const [isImageExtractionComplete, setIsImageExtractionComplete] = useState(true); // Track if extraction finished successfully

  // Check premium status on mount AND when session changes
  useEffect(() => {
    checkPremiumStatus();
    
    // Listen for prefill event from homepage
    const handlePrefill = (event: any) => {
      const content = event.detail;
      if (content) {
        setTextInput(content);
        setSelectedMaterial("notes");
      }
    };
    
    window.addEventListener('prefillExample', handlePrefill);
    
    // Listen for auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[InputView] Auth state changed:', event, 'Has session:', !!session);
        if (session) {
          checkPremiumStatus();
        } else {
          setIsPremium(false);
        }
      });
      
      return () => {
        subscription.unsubscribe();
        window.removeEventListener('prefillExample', handlePrefill);
      };
    }
    
    return () => {
      window.removeEventListener('prefillExample', handlePrefill);
    };
  }, []);

  const checkPremiumStatus = async () => {
    try {
      if (!supabase) {
        console.log('[InputView] Supabase not configured');
        setIsPremium(false);
        return;
      }

      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[InputView] Session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError
      });
      
      if (sessionError || !session) {
        console.log('[InputView] No session found - user not logged in');
        setIsPremium(false);
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
        console.log('[InputView] Premium status received:', data);
        setIsPremium(data.isPremium);
      } else if (response.status === 401) {
        console.log('[InputView] User not authenticated - treating as free user');
        setIsPremium(false);
      } else {
        console.log('[InputView] Premium check API failed:', response.status);
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Premium check failed:', error);
      setIsPremium(false);
    }
  };

  // Handler for locked premium features
  const handleLockedFeature = (feature: 'pdf' | 'image' | 'youtube', featureName: string) => {
    const check = canUseFeature(feature, isPremium);
    if (!check.allowed) {
      setPremiumModalReason(`${featureName} is a Premium feature. Upgrade to unlock unlimited ${featureName.toLowerCase()} and more!`);
      setShowPremiumModal(true);
      return true;
    }
    return false;
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    setError("");
  };

  /**
   * NEW: Multi-Image Upload Handler
   * - ONLY for images (no PDFs, DOCX, etc.)
   * - Stores File[] in state
   * - Sends all images in ONE FormData to /api/process-images
   * - Server handles OCR and text combination
   */
  const handleMultiImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Clear previous errors
    setError("");
    setImageProcessingProgress("");

    // Convert FileList to Array
    const filesArray = Array.from(files);

    console.log(`[Multi-Image] Selected ${filesArray.length} file(s)`);

    // Validate: Images only
    const nonImageFiles = filesArray.filter(file => !file.type.startsWith('image/'));
    if (nonImageFiles.length > 0) {
      setError(messages.errors.invalidFileType);
      e.target.value = ''; // Clear input
      return;
    }

    // Enforce frontend limits
    const maxAllowed = isPremium ? 5 : 1;
    if (filesArray.length > maxAllowed) {
      if (!isPremium) {
        setError(messages.errors.premiumMultiImage);
        setPremiumModalReason("Multi-image upload is a Premium feature. Upgrade to process up to 5 images at once!");
        setShowPremiumModal(true);
      } else {
        setError(messages.errors.tooManyImages);
      }
      e.target.value = '';
      return;
    }

    // Store images in state
    setSelectedImages(filesArray);
    console.log(`[Multi-Image] Stored ${filesArray.length} image(s) in state`);

    // Clear the file input so user can re-select if needed
    e.target.value = '';
  };

  /**
   * Process and upload all selected images to backend
   */
  const handleProcessImages = async () => {
    if (selectedImages.length === 0) {
      setError(messages.errors.noImages);
      return;
    }

    setIsLoading(true);
    setError("");
    setIsImageExtractionComplete(false); // Mark extraction as not yet complete
    setImageProcessingProgress(`Processing ${selectedImages.length} image(s)...`);

    try {
      // Get current user ID
      if (!supabase) {
        setError(messages.errors.connectionError);
        setIsLoading(false);
        setIsImageExtractionComplete(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(messages.errors.signInRequired);
        setIsLoading(false);
        setIsImageExtractionComplete(false);
        return;
      }

      // Build FormData with ALL images
      const formData = new FormData();
      formData.append("userId", session.user.id);
      
      // Append all images with the same key "images"
      for (let i = 0; i < selectedImages.length; i++) {
        formData.append("images", selectedImages[i]);
        console.log(`[Multi-Image] Appended image ${i + 1}: ${selectedImages[i].name}`);
      }

      setImageProcessingProgress(`Uploading ${selectedImages.length} image(s) for OCR processing...`);

      // Send ONE request to backend
      const response = await fetch("/api/process-images", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.premiumRequired) {
          setPremiumModalReason(data.error);
          setShowPremiumModal(true);
        }
        throw new Error(data.error || "Failed to process images");
      }

      // Success! Add extracted text to input
      const extractedText = data.text;
      setTextInput(prevText => 
        prevText ? `${prevText}\n\n${extractedText}` : extractedText
      );

      // Show success message
      setImageProcessingProgress(
        `✅ Successfully extracted text from ${data.metadata.imagesProcessed} image(s) ` +
        `(${data.metadata.totalCharacters} characters total)`
      );

      // Mark extraction as complete - NOW user can generate
      setIsImageExtractionComplete(true);

      // Clear selected images after processing
      setSelectedImages([]);

      console.log(`[Multi-Image] ✅ Processing complete:`, data.metadata);

    } catch (err) {
      console.error("[Multi-Image] Processing failed:", err);
      const errorMsg = err instanceof Error ? err.message : "";
      setError(errorMsg || messages.errors.imageProcessingFailed);
      setImageProcessingProgress("");
      setIsImageExtractionComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log(`🔍 [UPLOAD DEBUG] Selected ${files.length} file(s)`);
    console.log(`🔍 [UPLOAD DEBUG] isPremium state: ${isPremium}`);
    console.log(`🔍 [UPLOAD DEBUG] Input element multiple attribute: ${e.target.multiple}`);
    for (let i = 0; i < files.length; i++) {
      console.log(`  - File ${i + 1}: ${files[i].name} (${files[i].type})`);
    }

    // Enforce file limits based on plan
    if (!isPremium && files.length > 1) {
      setError(messages.errors.premiumMultiImage);
      setPremiumModalReason("Multi-image upload is a Premium feature. Upgrade to process multiple images at once!");
      setShowPremiumModal(true);
      e.target.value = ''; // Clear the input
      return;
    }

    // Premium users: allow up to 10 images at once
    if (isPremium && files.length > 10) {
      setError(messages.errors.tooManyImages);
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setError("");
    setIsImageExtractionComplete(false); // Reset extraction state when new images are selected

    try {
      const newUploadedFiles = [...uploadedFiles];
      let allText = textInput;
      const errors: string[] = [];

      // Process all selected files
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        try {
          // Handle PDF files CLIENT-SIDE with pdf.js
          if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
            try {
              console.log(`📄 Extracting PDF ${fileIndex + 1}/${files.length} client-side...`);
              const pdfjsLib = await import("pdfjs-dist");
              
              // Set worker path
              pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
              
              // Read file as array buffer
              const arrayBuffer = await file.arrayBuffer();
              
              // Load PDF
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
              
              let fullText = "";
              
              // Extract text from each page
              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(" ");
                fullText += pageText + "\n\n";
              }
              
              if (!fullText || fullText.trim().length < 20) {
                errors.push(`${file.name}: No text found in PDF`);
                continue;
              }
              
              console.log(`✅ Extracted ${fullText.length} characters from PDF`);
              
              // Add to uploaded files
              const newFile = { name: file.name, text: fullText.trim() };
              newUploadedFiles.push(newFile);
              
              // Add to text input
              allText = allText 
                ? `${allText}\n\n--- From ${file.name} ---\n${fullText.trim()}` 
                : fullText.trim();
            } catch (pdfError: any) {
              errors.push(`${file.name}: ${pdfError.message || "Failed to extract"}`);
              continue;
            }
          }
          // Handle DOCX/DOC files - send to server
          else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                   fileName.endsWith(".docx") ||
                   fileName.endsWith(".doc")) {
            
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/extract-text", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const data = await res.json();
              errors.push(`${file.name}: ${data.error || "Failed to extract"}`);
              continue;
            }

            const { text: extractedText, metadata } = await res.json();
            
            if (!extractedText || extractedText.trim().length === 0) {
              errors.push(`${file.name}: No text found`);
              continue;
            }
            
            const newFile = { name: file.name, text: extractedText };
            newUploadedFiles.push(newFile);
            
            const fileInfo = metadata ? ` (${metadata.wordCount} words)` : '';
            allText = allText ? `${allText}\n\n--- From ${file.name}${fileInfo} ---\n${extractedText}` : extractedText;
          }
          // Handle images with Tesseract OCR
          else if (fileType.startsWith("image/")) {
            console.log(`🖼️ Processing image ${fileIndex + 1}/${files.length}...`);
            const Tesseract = await import("tesseract.js");
            const result = await Tesseract.recognize(file, "eng", {
              logger: (m) => console.log(m),
            });
            
            const extractedText = result.data.text;
            
            if (!extractedText || extractedText.trim().length === 0) {
              errors.push(`${file.name}: No text found in image`);
              continue;
            }
            
            // Add to uploaded files list
            const newFile = { name: file.name, text: extractedText };
            newUploadedFiles.push(newFile);
            
            // Also add to main text input
            allText = allText ? `${allText}\n\n--- From ${file.name} ---\n${extractedText}` : extractedText;
          }
          else {
            errors.push(`${file.name}: Unsupported file type`);
          }
        } catch (fileError) {
          errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`);
        }
      }

      // Update state with all processed files
      console.log(`✅ [UPLOAD DEBUG] Successfully processed ${newUploadedFiles.length - uploadedFiles.length} new file(s)`);
      console.log(`📊 [UPLOAD DEBUG] Total files in state: ${newUploadedFiles.length}`);
      console.log(`📝 [UPLOAD DEBUG] Total text length: ${allText.length} characters`);
      
      setUploadedFiles(newUploadedFiles);
      setTextInput(allText);

      // Reset the input so user can upload files again (including same files)
      const fileInput = e.target as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }

      // Show results or errors
      if (errors.length > 0) {
        if (newUploadedFiles.length > uploadedFiles.length) {
          // Some files processed successfully
          setError(`Processed ${newUploadedFiles.length - uploadedFiles.length} file(s). Issues: ${errors.join(", ")}`);
        } else {
          // All files failed
          setError(errors.join(", "));
        }
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed_process_file"));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!textInput.trim()) {
      setError(messages.errors.noContent);
      return;
    }

    // Check for YouTube URL and extract transcript
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/i;
    if (youtubeRegex.test(textInput)) {
      setIsLoading(true);
      setError("");

      try {
        const formData = new FormData();
        formData.append("youtubeUrl", textInput.trim());

        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || messages.errors.youtubeExtraction);
          setIsLoading(false);
          return;
        }

        const { text: transcript } = await res.json();
        setTextInput(transcript);
        setIsLoading(false);
        
        // Show success message and let user review transcript before generating
        alert(messages.success.transcriptExtracted);
        return;
      } catch (err) {
        setError(messages.errors.youtubeNeedsCaptions);
        setIsLoading(false);
        return;
      }
    }

    if (textInput.length < 20) {
      setError(messages.errors.notEnoughContent);
      return;
    }

    setIsLoading(true);
    setLoadingStage("processing");
    setError("");

    try {
      console.log("Calling AI API...");
      
      // Show analyzing stage
      setTimeout(() => setLoadingStage("analyzing"), 500);
      
      // Combine main text input with all uploaded files
      let combinedText = textInput;
      if (uploadedFiles.length > 0) {
        combinedText += '\n\n' + uploadedFiles.map(file => 
          `--- From ${file.name} ---\n${file.text}`
        ).join('\n\n');
      }
      
      // Show generating stage
      setTimeout(() => setLoadingStage("generating"), 1500);
      
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: combinedText,
          numberOfFlashcards,
          difficulty
        }),
      });

      console.log("API response status:", res.status);
      
      // Show finalizing stage
      setLoadingStage("finalizing");

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("API error:", data);
        throw new Error(data?.error || messages.errors.generationFailed);
      }

      const cards = (await res.json()) as Flashcard[];
      console.log("AI generated cards:", cards);
      onGenerateFlashcards(cards);
    } catch (err) {
      console.error("Failed to generate with AI:", err);
      const details = err instanceof Error ? err.message : '';
      setError(details || messages.errors.generationFailed);
    } finally {
      setIsLoading(false);
      setLoadingStage(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-brand bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            StudyMaxx
          </h1>
          <p className="text-body-large text-gray-600 dark:text-gray-300 font-light">
            AI-powered study tools that actually work
          </p>
        </div>

        {/* Back Button - Only show when onBack is provided */}
        {onBack && (
          <div className="flex justify-center mb-8">
            <button
              onClick={onBack}
              className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium rounded-full border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all flex items-center gap-2"
            >
              <ArrowIcon direction="left" size={16} />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* View Saved Sets Button - Subtle */}
        {!selectedMaterial && (
          <div className="flex justify-center mb-8">
            <button
              onClick={onViewSavedSets}
              className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium rounded-full border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
            >
              📚 My Sets
            </button>
          </div>
        )}

        {/* Material Selection Screen */}
        {!selectedMaterial ? (
          <div className="card-elevated p-20" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div className="mb-10">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
                Paste your notes
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                We'll turn them into flashcards instantly
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Notes Option - Recommended */}
              <button
                onClick={() => setSelectedMaterial("notes")}
                className="group relative p-8 border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                  Start here
                </div>
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Paste notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fastest way to get flashcards
                </p>
              </button>

              {/* PDF/Documents Option */}
              <button
                onClick={() => {
                  if (handleLockedFeature('pdf', 'PDF uploads')) return;
                  setSelectedMaterial("pdf");
                }}
                className="group relative p-8 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                {!isPremium && (
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    ⭐ Premium
                  </div>
                )}
                <div className="text-5xl mb-4">📄</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Upload files</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  PDF, Word, images, YouTube
                </p>
              </button>

              {/* YouTube Option */}
              <button
                onClick={() => {
                  if (handleLockedFeature('youtube', 'YouTube transcripts')) return;
                  setSelectedMaterial("youtube");
                }}
                className="group relative p-8 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                {!isPremium && (
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    ⭐ Premium
                  </div>
                )}
                <div className="text-5xl mb-4">📺</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">YouTube</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From video transcript
                </p>
              </button>

              {/* Image Option */}
              <button
                onClick={() => {
                  if (handleLockedFeature('image', 'Image OCR')) return;
                  setSelectedMaterial("image");
                }}
                className="group relative p-8 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                {!isPremium && (
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    ⭐ Premium
                  </div>
                )}
                <div className="text-5xl mb-4">🖼️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Image</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload an image
                </p>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-elevated p-20" style={{ borderRadius: 'var(--radius-xl)' }}>
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedMaterial(null);
                setTextInput("");
                setError("");
              }}
              className="mb-6 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-2 transition-colors"
            >
              <ArrowIcon direction="left" size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMaterial(null);
                setTextInput("");
                setError("");
              }}
              className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-2"
            >
              <ArrowIcon direction="left" size={16} />
              <span>Change material type</span>
            </button>

            {/* Notes Input */}
            {(selectedMaterial === "notes" || selectedMaterial === "youtube") && (
              <div className="mb-8">
                <label htmlFor="text-input" className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {selectedMaterial === "notes" ? "Your notes" : "YouTube video URL"}
                </label>
                <textarea
                  id="text-input"
                  value={textInput}
                  onChange={handleTextChange}
                  placeholder={selectedMaterial === "notes" 
                    ? "Paste your notes here..." 
                    : "Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"}
                  className="w-full h-56 px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white resize-none text-base transition-all"
                  autoFocus
                />
                
                {/* Character and flashcard estimate */}
                {selectedMaterial === "notes" && textInput.length > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {textInput.length} tegn
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Vil generere ca. {Math.min(numberOfFlashcards, Math.max(3, Math.floor(textInput.trim().split(/\s+/).length / 30)))} kunnskapskort
                      {!isPremium && numberOfFlashcards > FREE_LIMITS.maxFlashcardsPerSet && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400">
                          (maks {FREE_LIMITS.maxFlashcardsPerSet} for gratis)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {/* Optional: Add images to notes */}
                {selectedMaterial === "notes" && (
                  <div className="mt-4">
                    <label htmlFor="notes-file-input" className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2 block">
                      Optional: Add images with additional content
                      {isPremium ? (
                        <span className="ml-2 text-xs text-teal-600 dark:text-teal-400">✓ Premium: up to 10 images</span>
                      ) : (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Free: 1 image only</span>
                      )}
                    </label>
                    <input
                      id="notes-file-input"
                      type="file"
                      accept="image/*"
                      {...(isPremium && { multiple: true })}
                      onChange={handleImageUpload}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-900 text-sm"
                    />
                  </div>
                )}
                
                {/* Show uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <span className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <span>📎</span>
                          <span>{file.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFiles = uploadedFiles.filter((_, i) => i !== index);
                            setUploadedFiles(newFiles);
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Image Upload - NEW MULTI-IMAGE IMPLEMENTATION */}
            {selectedMaterial === "image" && (
              <div className="mb-8">
                <label htmlFor="multi-image-input" className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Upload Images for OCR
                </label>
                
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2 font-medium">
                    📸 Multi-Image Upload (Images Only)
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {isPremium ? (
                      <>
                        ✓ <strong>Premium:</strong> Select up to 5 images at once for faster processing
                      </>
                    ) : (
                      <>
                        Free plan: 1 image at a time. <button type="button" onClick={() => setShowPremiumModal(true)} className="underline font-semibold">Upgrade to Premium</button> to upload up to 5 images at once.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    ⚠️ Processing multiple images may take 30-60 seconds
                  </p>
                </div>

                <input
                  id="multi-image-input"
                  type="file"
                  accept="image/*"
                  multiple={isPremium}
                  onChange={handleMultiImageSelect}
                  disabled={isLoading}
                  className="w-full px-5 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                />
                
                {/* Show selected images (before processing) */}
                {selectedImages.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {selectedImages.length} image(s) selected
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedImages([])}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <span className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                            <span>📎</span>
                            <span>{image.name}</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              ({(image.size / 1024).toFixed(1)} KB)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImages(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Process button */}
                    <button
                      type="button"
                      onClick={handleProcessImages}
                      disabled={isLoading || selectedImages.length === 0}
                      className={`w-full mt-4 px-6 py-4 font-bold rounded-xl transition-all shadow-lg text-white flex items-center justify-center gap-2 ${
                        isLoading 
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 cursor-wait"
                          : isImageExtractionComplete
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <span className="animate-spin">⚙️</span>
                          <span>Extracting text...</span>
                        </>
                      ) : isImageExtractionComplete ? (
                        <>
                          <span>✅</span>
                          <span>Text ready to use</span>
                        </>
                      ) : (
                        <>
                          <span>📄</span>
                          <span>Extract text from {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </button>
                    
                    {/* Progress indicator - shows status and prevents confusion */}
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      {isLoading && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            ⏳ Reading your images...
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {imageProcessingProgress}
                          </p>
                          <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                            This usually takes 10-30 seconds. Don't close the app.
                          </p>
                        </div>
                      )}
                      {!isLoading && isImageExtractionComplete && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            ✅ {imageProcessingProgress}
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Ready to proceed! The extracted text has been added to your notes.
                          </p>
                        </div>
                      )}
                      {!isLoading && !isImageExtractionComplete && selectedImages.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Click the button above to extract text from your image{selectedImages.length !== 1 ? 's' : ''}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Show processing note */}
                {selectedImages.length === 0 && !isLoading && (
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Select images above to get started
                  </p>
                )}
              </div>
            )}

            {/* PDF Upload */}
            {selectedMaterial === "pdf" && (
              <div className="mb-8">
                <label htmlFor="pdf-input" className="block text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Upload your document or PDF
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {isPremium ? (
                    <span className="text-teal-600 dark:text-teal-400 font-medium">✓ Premium: Upload multiple files at once</span>
                  ) : (
                    <span>Free plan: 1 file at a time</span>
                  )}
                </p>
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf,.pdf,.docx,.doc,.txt,image/*"
                  {...(isPremium && { multiple: true })}
                  onChange={handleImageUpload}
                  disabled={isLoading}
                  className="w-full px-5 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Supports: PDF, DOCX, TXT, PNG, JPG (max 10MB per file)
                </p>
                
                {/* Show uploaded PDF files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <span className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                          <span>✓</span>
                          <span>{file.name}</span>
                          <span className="text-xs text-green-600 dark:text-green-400">({file.text.length} chars)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFiles = uploadedFiles.filter((_, i) => i !== index);
                            setUploadedFiles(newFiles);
                            setTextInput(newFiles.map(f => `--- From ${f.name} ---\n${f.text}`).join('\n\n'));
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User Controls - Difficulty & Amount */}
            <div className="mb-8 space-y-6">
              {/* Difficulty Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Easy", "Medium", "Hard"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        difficulty === level
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Flashcards */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Number of flashcards: {numberOfFlashcards}
                  {!isPremium && numberOfFlashcards > FREE_LIMITS.maxFlashcardsPerSet && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                      (Max {FREE_LIMITS.maxFlashcardsPerSet} for free users)
                    </span>
                  )}
                </label>
                <input
                  type="range"
                  min="3"
                  max={isPremium ? "20" : FREE_LIMITS.maxFlashcardsPerSet.toString()}
                  value={Math.min(numberOfFlashcards, isPremium ? 20 : FREE_LIMITS.maxFlashcardsPerSet)}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isPremium && value > FREE_LIMITS.maxFlashcardsPerSet) {
                      setPremiumModalReason(`Free users are limited to ${FREE_LIMITS.maxFlashcardsPerSet} flashcards per set. Upgrade to Premium for unlimited flashcards!`);
                      setShowPremiumModal(true);
                      return;
                    }
                    setNumberOfFlashcards(value);
                  }}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>3</span>
                  <span>{isPremium ? '20' : FREE_LIMITS.maxFlashcardsPerSet}</span>
                </div>
                {!isPremium && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ⭐ Premium users can create up to 20 flashcards
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-12 p-8 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl">
                <p className="text-lg text-red-700 dark:text-red-300 font-bold">{error}</p>
              </div>
            )}

            {/* Warning if extraction not complete for images */}
            {selectedImages.length > 0 && !isImageExtractionComplete && !isLoading && (
              <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <span>⏳</span>
                  <span>Please extract text from your images first</span>
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Scroll up and click "Extract text" above, then you can create flashcards.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !textInput.trim() || (selectedImages.length > 0 && !isImageExtractionComplete)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-6 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-xl"
            >
              {isLoading ? (
                <span className="flex flex-col items-center justify-center gap-2">
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⚡</span>
                    {loadingStage === "processing" && "Reading your notes..."}
                    {loadingStage === "analyzing" && "Understanding the content..."}
                    {loadingStage === "generating" && "Creating flashcards..."}
                    {loadingStage === "finalizing" && "Polishing them up..."}
                    {!loadingStage && "Making flashcards..."}
                  </span>
                  <span className="text-xs opacity-75">Takes about 10-15 seconds</span>
                </span>
              ) : (
                "Create flashcards"
              )}
            </button>
          </form>
        )}
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          customMessage={premiumModalReason}
        />
      )}
    </div>
  );
}
