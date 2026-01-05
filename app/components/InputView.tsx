"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { generateFlashcards } from "../utils/flashcardGenerator";
import { Flashcard } from "../utils/storage";
import { useTranslation } from "../contexts/SettingsContext";
import ArrowIcon from "./icons/ArrowIcon";
import { canUseFeature, FREE_LIMITS, getUserLimits } from "../utils/premium";
import PremiumModal from "./PremiumModal";
import { supabase } from "../utils/supabase";

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
  const [error, setError] = useState("");
  
  // User controls
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [numberOfFlashcards, setNumberOfFlashcards] = useState(7);
  
  // Multiple files support
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; text: string }[]>([]);

  // Check premium status on mount AND when session changes
  useEffect(() => {
    checkPremiumStatus();
    
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
      
      return () => subscription.unsubscribe();
    }
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

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError("");

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
      setError(t("enter_text_or_upload"));
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
          setError(data.error || t("failed_extract_youtube"));
          setIsLoading(false);
          return;
        }

        const { text: transcript } = await res.json();
        setTextInput(transcript);
        setIsLoading(false);
        
        // Show success message and let user review transcript before generating
        alert('✓ ' + t("transcript_extracted"));
        return;
      } catch (err) {
        setError(t("youtube_needs_captions"));
        setIsLoading(false);
        return;
      }
    }

    if (textInput.length < 20) {
      setError(t("provide_more_content"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("Calling AI API...");
      
      // Combine main text input with all uploaded files
      let combinedText = textInput;
      if (uploadedFiles.length > 0) {
        combinedText += '\n\n' + uploadedFiles.map(file => 
          `--- From ${file.name} ---\n${file.text}`
        ).join('\n\n');
      }
      
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("API error:", data);
        throw new Error(data?.error || "AI generation failed");
      }

      const cards = (await res.json()) as Flashcard[];
      console.log("AI generated cards:", cards);
      onGenerateFlashcards(cards);
    } catch (err) {
      console.error("Failed to generate with AI:", err);
      setError(`AI generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Check your API key and try again.`);
    } finally {
      setIsLoading(false);
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
          <div className="card-elevated p-10" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                What are you studying?
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Choose your learning material
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Notes Option - Recommended */}
              <button
                onClick={() => setSelectedMaterial("notes")}
                className="group relative p-8 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                  Recommended
                </div>
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Paste your study notes
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Files</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload PDF, DOCX, or images
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
          <form onSubmit={handleSubmit} className="card-elevated p-10" style={{ borderRadius: 'var(--radius-xl)' }}>
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
                    <label htmlFor="notes-file-input" className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                      Optional: Add images with additional content
                    </label>
                    <input
                      id="notes-file-input"
                      type="file"
                      accept="image/*"
                      multiple
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

            {/* Image Upload */}
            {selectedMaterial === "image" && (
              <div className="mb-8">
                <label htmlFor="file-input" className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Upload images
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isLoading}
                  className="w-full px-5 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                />
                
                {/* Show uploaded files */}
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
                            // Recalculate textInput
                            setTextInput(newFiles.map(f => `--- From ${f.name} ---\n${f.text}`).join('\n\n'));
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Upload another image to add more content
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PDF Upload */}
            {selectedMaterial === "pdf" && (
              <div className="mb-8">
                <label htmlFor="pdf-input" className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Upload your document or PDF
                </label>
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf,.pdf,.docx,.doc,.txt,image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isLoading}
                  className="w-full px-5 py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Supports: PDF, DOCX, TXT, PNG, JPG (max 10MB)
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
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚡</span>
                  Creating flashcards...
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
