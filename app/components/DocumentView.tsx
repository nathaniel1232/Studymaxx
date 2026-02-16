"use client";

import { useState, useRef, useEffect } from "react";
import { Flashcard, generateFlashcards } from "../utils/flashcardGenerator";
import { saveFlashcardSet } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";
import { supabase, getCurrentUser } from "../utils/supabase";
import CustomizeGenerationModal, { GenerationSettings } from "./CustomizeGenerationModal";

interface DocumentViewProps {
  onBack: () => void;
  onGenerateFlashcards: (cards: Flashcard[], subject: string, grade?: string) => void;
  onGenerateQuiz?: (questions: any[], subject: string) => void;
  onGenerateMatch?: (terms: string[], definitions: string[], subject: string) => void;
  isPremium: boolean;
  user?: any;
  initialSubject?: string;
}

// Icons
const FlashcardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h6" />
  </svg>
);

const QuizIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const MatchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <path d="M10 6.5h4" />
    <path d="M10 17.5h4" />
  </svg>
);

const SaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" />
    <polyline points="7,3 7,8 15,8" />
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function DocumentView({
  onBack,
  onGenerateFlashcards,
  onGenerateQuiz,
  onGenerateMatch,
  isPremium,
  user,
  initialSubject = "",
}: DocumentViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Document state
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [documentText, setDocumentText] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [pendingGenerationType, setPendingGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    count: 15,
    difficulty: "Medium",
    matchPairs: 8,
    outputLanguage: "auto",
  });

  // Generated content state
  const [savedFlashcards, setSavedFlashcards] = useState<Flashcard[]>([]);
  const [savedQuizQuestions, setSavedQuizQuestions] = useState<any[]>([]);
  const [savedMatchData, setSavedMatchData] = useState<{ terms: string[]; definitions: string[] } | null>(null);

  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // Mobile chat toggle
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Loading timer
  useEffect(() => {
    if (!isGenerating) { setElapsedSeconds(0); return; }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (!documentText.trim()) return;

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSaveDocument();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [documentText, documentTitle, subject]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsExtracting(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();

      // Handle .txt files directly in the browser
      if (fileExt === "txt") {
        const text = await file.text();
        if (!text.trim()) {
          throw new Error("The text file is empty.");
        }
        setDocumentText(text);
        if (!subject && file.name) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          setSubject(nameWithoutExt);
          setDocumentTitle(nameWithoutExt);
        }
        setIsExtracting(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      let endpoint = "/api/extract-text";
      
      if (fileExt === "pdf") {
        endpoint = "/api/extract-pdf";
      } else if (["doc", "docx"].includes(fileExt || "")) {
        endpoint = "/api/extract-docx";
      } else if (["ppt", "pptx"].includes(fileExt || "")) {
        endpoint = "/api/extract-pptx";
      } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt || "")) {
        endpoint = "/api/extract-image";
      }

      console.log(`[DocumentView] Uploading file: ${file.name} (${file.type}) to ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[DocumentView] File extraction failed:", errorData);
        throw new Error(errorData.error || "Failed to extract text from file");
      }

      const data = await response.json();
      console.log("[DocumentView] Extraction response:", {
        textLength: data.text?.length || 0,
        preview: data.text?.substring(0, 100)
      });

      if (!data.text || data.text.trim().length === 0) {
        throw new Error("No text could be extracted from the file. Please ensure the file contains readable text or images with text.");
      }

      setDocumentText(data.text || "");
      
      // Auto-detect subject from filename
      if (!subject && file.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setSubject(nameWithoutExt);
        setDocumentTitle(nameWithoutExt);
      }
    } catch (err: any) {
      console.error("[DocumentView] File upload error:", err);
      setError(err.message || "Failed to process file");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!documentText.trim()) return;
    
    setIsSaving(true);
    try {
      const docData = {
        id: `doc-${Date.now()}`,
        title: documentTitle,
        content: documentText,
        subject: subject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const savedDocs = JSON.parse(localStorage.getItem('studymaxx_documents') || '[]');
      savedDocs.unshift(docData);
      localStorage.setItem('studymaxx_documents', JSON.stringify(savedDocs.slice(0, 50)));
      
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save document:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "gif", "webp"];
    if (!ext || !allowedExts.includes(ext)) {
      setError(`Unsupported file type: .${ext}. Supported: PDF, Word, PowerPoint, TXT, and images.`);
      return;
    }
    
    processFile(file);
  };

  const openCustomizeModal = (type: "flashcards" | "quiz" | "match") => {
    setPendingGenerationType(type);
    setShowCustomizeModal(true);
  };

  const handleGenerateWithSettings = (settings: GenerationSettings) => {
    setGenerationSettings(settings);
    handleGenerateWithConfig(settings);
  };

  const handleGenerate = async () => {
    handleGenerateWithConfig(generationSettings);
  };

  const handleGenerateWithConfig = async (config: GenerationSettings) => {
    if (!documentText.trim()) {
      setError("Please add content first");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject name");
      return;
    }

    // Free trial check: allow 1 free upload (file OR audio), then require premium
    if (!isPremium) {
      const key = `upload_trial_used_${user?.id || 'anon'}`;
      const trialUsed = localStorage.getItem(key) === 'true';
      if (trialUsed) {
        setError("You've used your free upload trial. Upgrade to Premium for unlimited file uploads!");
        return;
      }
    }

    const type = pendingGenerationType;
    if (!type) return;

    console.log("[DocumentView] Starting generation:", { type, subject, textLength: documentText.length, count: config.count });

    setShowCustomizeModal(false);
    setIsGenerating(true);
    setGenerationType(type);
    setError("");

    try {
      if (type === "flashcards") {
        console.log("[DocumentView] Calling /api/generate for flashcards...");
        console.log("[DocumentView] User object:", user);
        console.log("[DocumentView] User ID:", user?.id);
        console.log("[DocumentView] isPremium prop:", isPremium);
        console.log("[DocumentView] Request payload:", {
          userId: user?.id || `anon_${Date.now()}`,
          textLength: documentText.length,
          numberOfFlashcards: config.count,
          subject: subject,
          difficulty: config.difficulty,
        });
        
        // Use the central /api/generate endpoint
        let response;
        try {
          response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?.id || `anon_${Date.now()}`,
              text: documentText,
              numberOfFlashcards: config.count,
              subject: subject,
              targetGrade: "A",
              difficulty: config.difficulty,
              outputLanguage: config.outputLanguage,
              materialType: "document",
            }),
          });
        } catch (fetchError: any) {
          console.error("[DocumentView] Fetch request failed:", fetchError);
          throw new Error(`Network error: ${fetchError.message}. Please check your internet connection.`);
        }

        console.log("[DocumentView] API response status:", response.status);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
            console.error("[DocumentView] API error data:", JSON.stringify(errorData, null, 2));
          } catch (e) {
            console.error("[DocumentView] Could not parse error response as JSON:", e);
            errorData = { error: `Server error: ${response.status} ${response.statusText}` };
          }
          console.error("[DocumentView] Response status:", response.status, response.statusText);
          
          // Provide helpful error messages with suggestions
          let userMessage = errorData.error || `Failed to generate flashcards (${response.status})`;
          
          // Add helpful suggestions for specific error types
          if (response.status === 429) {
            if (errorData.code === "RATE_LIMIT_EXCEEDED") {
              userMessage = errorData.error; // Use the message with reset time
            } else {
              userMessage += " Try again in a few seconds.";
            }
          } else if (response.status === 504 || errorData.code === "AI_TIMEOUT") {
            userMessage += " Consider using less content or reducing the number of flashcards.";
          } else if (response.status === 503) {
            userMessage += " Please try again in a few minutes.";
          }
          
          throw new Error(userMessage);
        }
        
        const data = await response.json();
        console.log("[DocumentView] Generated flashcards:", data.flashcards?.length || 0);
        
        const flashcards = data.flashcards || [];
        
        if (flashcards.length === 0) {
          throw new Error("No flashcards were generated. Please try with different content.");
        }
        
        setSavedFlashcards(flashcards);

        // Auto-save the flashcard set
        try {
          const setName = subject || documentTitle || "Untitled Set";
          await saveFlashcardSet(setName, flashcards, subject, "A");
          console.log("[DocumentView] Flashcards saved to storage");
        } catch (saveError) {
          console.error("Auto-save failed:", saveError);
        }

        console.log("[DocumentView] Calling onGenerateFlashcards callback");
        onGenerateFlashcards(flashcards, subject, "A");
      } else if (type === "quiz") {
        // Generate quiz using flashcards + distractors approach
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || `anon_${Date.now()}`,
            text: documentText,
            numberOfFlashcards: config.count,
            subject: subject,
            targetGrade: "A",
            difficulty: config.difficulty,
            outputLanguage: config.outputLanguage,
            materialType: "document",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          let userMessage = errorData.error || "Failed to generate quiz";
          
          if (response.status === 429) {
            userMessage += " Try again in a few seconds.";
          } else if (response.status === 504) {
            userMessage += " Consider using less content.";
          }
          
          throw new Error(userMessage);
        }
        
        const data = await response.json();
        // Convert flashcards to quiz format
        const quizQuestions = (data.flashcards || []).map((card: any, index: number) => ({
          id: index + 1,
          question: card.question,
          correctAnswer: card.answer,
          options: card.distractors && card.distractors.length > 0 
            ? shuffleArray([card.answer, ...card.distractors.slice(0, 3)])
            : [card.answer],
        }));
        
        setSavedQuizQuestions(quizQuestions);
        onGenerateQuiz?.(quizQuestions, subject);
      } else if (type === "match") {
        // Generate match game using flashcards
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || `anon_${Date.now()}`,
            text: documentText,
            numberOfFlashcards: config.matchPairs,
            subject: subject,
            targetGrade: "A",
            difficulty: config.difficulty,
            outputLanguage: config.outputLanguage,
            materialType: "document",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          let userMessage = errorData.error || "Failed to generate match game";
          
          if (response.status === 429) {
            userMessage += " Try again in a few seconds.";
          } else if (response.status === 504) {
            userMessage += " Consider reducing the number of pairs.";
          }
          
          throw new Error(userMessage);
        }
        
        const data = await response.json();
        const flashcards = data.flashcards || [];
        const terms = flashcards.map((card: any) => card.question);
        const definitions = flashcards.map((card: any) => card.answer);
        
        setSavedMatchData({ terms, definitions });
        onGenerateMatch?.(terms, definitions, subject);
      }

      // Mark upload trial as used after successful generation
      if (!isPremium) {
        const key = `upload_trial_used_${user?.id || 'anon'}`;
        localStorage.setItem(key, 'true');
      }
    } catch (err: any) {
      console.error("[DocumentView] Generation error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
        error: err
      });
      setError(err.message || "Failed to generate content");
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  // Helper function to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const loadSavedContent = (type: "flashcards" | "quiz" | "match") => {
    if (type === "flashcards" && savedFlashcards.length > 0) {
      onGenerateFlashcards(savedFlashcards, subject, "A");
    } else if (type === "quiz" && savedQuizQuestions.length > 0) {
      onGenerateQuiz?.(savedQuizQuestions, subject);
    } else if (type === "match" && savedMatchData) {
      onGenerateMatch?.(savedMatchData.terms, savedMatchData.definitions, subject);
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isChatLoading) return;
    
    const userMessage = chatMessage.trim();
    setChatMessage("");
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: documentText,
          subject: subject,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");
      
      const decoder = new TextDecoder();
      let fullText = "";
      
      // Add empty AI message that we'll update as chunks arrive
      setChatMessages(prev => [...prev, { role: "ai", text: "" }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "ai", text: fullText };
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }
      
      if (!fullText.trim()) {
        setChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "ai", text: "I couldn't generate a response." };
          return updated;
        });
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "ai", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: isDarkMode ? "#1a1a2e" : "#f1f5f9" }}>
      {/* Main Document Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div
          className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
          style={{
            backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.95)" : "rgba(255, 255, 255, 0.95)",
            borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center" 
                style={{ background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-lg font-bold bg-transparent border-none outline-none"
                style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                placeholder="Document Title"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
              title="Upload File"
            >
              <UploadIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Subject Input Bar */}
        <div 
          className="px-6 py-3 border-b flex items-center gap-3"
          style={{
            backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.5)" : "rgba(241, 245, 249, 0.95)",
            borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
          }}
        >
          <span className="text-sm font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#64748b" }}>Subject:</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Biology, History, Math"
            className="flex-1 text-sm bg-transparent border-none outline-none"
            style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
          />
          {lastSaved && (
            <span className="text-xs" style={{ color: isDarkMode ? "#5f6368" : "#94a3b8" }}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Document Content Area */}
        <div className="flex-1 p-6 pb-20 lg:pb-6 overflow-auto" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {isExtracting ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1a73e8', borderTopColor: 'transparent' }} />
              <p style={{ color: isDarkMode ? '#9aa0a6' : '#475569' }}>Extracting content from {uploadedFile?.name}...</p>
            </div>
          ) : documentText ? (
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="w-full h-full min-h-[400px] p-6 rounded-xl resize-none outline-none text-base leading-relaxed"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', 
                color: isDarkMode ? '#ffffff' : '#000000',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'}`
              }}
              placeholder="Your document content will appear here. You can also paste or type directly..."
            />
          ) : (
            <div 
              className="flex flex-col items-center justify-center h-full gap-6 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 hover:border-solid hover:scale-[1.01] hover:shadow-xl"
              style={{ 
                borderColor: isDragging ? '#06b6d4' : isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', 
                backgroundColor: isDragging 
                  ? (isDarkMode ? 'rgba(6, 182, 212, 0.08)' : 'rgba(6, 182, 212, 0.05)')
                  : isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
                transform: isDragging ? 'scale(1.01)' : undefined,
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8' }}
              >
                <DocumentIcon />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                  Drop a file or click to upload
                </h3>
                <p style={{ color: isDarkMode ? '#9aa0a6' : '#475569' }}>
                  PDF, Word, images, or paste text directly
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#475569' }}>
                <span>Or</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocumentText(" ");
                  }}
                  className="font-medium transition-all duration-200 hover:scale-105"
                  style={{ color: '#1a73e8' }}
                >
                  start typing
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Side Panel - Desktop only */}
      <aside 
        className="hidden lg:flex w-80 border-l flex-col"
        style={{ 
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', 
          backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.5)' : 'rgba(241, 245, 249, 0.95)' 
        }}
      >
        {/* Create Section */}
        <div className="p-4 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: isDarkMode ? "#e8eaed" : "#000000" }}>
            Create from Document
          </h3>
          
          <div className="space-y-2">
            {/* Single Create Study Set button */}
            <button
              onClick={() => openCustomizeModal("flashcards")}
              disabled={isGenerating}
              className="w-full px-4 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                color: "#ffffff",
                opacity: isGenerating ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
              }}
            >
              {isGenerating ? <SpinnerIcon /> : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                </svg>
              )}
              Create Study Set
            </button>
            
            {savedFlashcards.length > 0 && (
              <button
                onClick={() => loadSavedContent("flashcards")}
                className="w-full px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: isDarkMode ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.08)",
                  color: "#22c55e",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                }}
              >
                📚 Open Last Set ({savedFlashcards.length} cards)
              </button>
            )}
          </div>
          
          <p className="text-xs mt-3 text-center" style={{ color: isDarkMode ? "#9aa0a6" : "#475569" }}>
            Generates flashcards, quiz & match in one set
          </p>
        </div>

        {/* AI Chat Section */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
            <h3 className="text-base font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
              StudyMaxx AI
            </h3>
            <p className="text-xs" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              Ask questions about your document
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(26, 115, 232, 0.1)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="font-medium mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                  Ask me anything about your document!
                </p>
                <p className="text-xs" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  "Summarize this" • "Explain the main points"
                </p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      backgroundColor: msg.role === "user" ? "#1a73e8" : isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)",
                      color: msg.role === "user" ? "#ffffff" : "#1a73e8"
                    }}
                  >
                    {msg.role === "user" ? "You" : "AI"}
                  </div>
                  
                  <div className="flex-1">
                    <div
                      className="text-sm leading-relaxed"
                      style={{ color: isDarkMode ? "#e2e8f0" : "#1e293b" }}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="flex gap-3 items-start">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)" }}
                >
                  <SpinnerIcon />
                </div>
                <div className="text-sm" style={{ color: isDarkMode ? "#9aa0a6" : "#64748b" }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
            <div 
              className="flex items-center gap-2 p-2 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              }}
            >
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                placeholder="Ask about your document..."
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder-gray-500 dark:placeholder-gray-400 input-text-fix"
                disabled={isChatLoading}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatMessage.trim() || isChatLoading}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "#1a73e8", color: "#ffffff" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile: Fixed bottom Create button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 backdrop-blur-md" style={{ 
        backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` 
      }}>
        <div className="flex gap-2">
          <button
            onClick={() => openCustomizeModal("flashcards")}
            disabled={isGenerating}
            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
              color: "#ffffff",
              opacity: isGenerating ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
            }}
          >
            {isGenerating ? <SpinnerIcon /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
              </svg>
            )}
            Create Study Set
          </button>
          <button
            onClick={() => setShowMobileChat(!showMobileChat)}
            className="px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition-all"
            style={{
              backgroundColor: showMobileChat ? '#1a73e8' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
              color: showMobileChat ? '#ffffff' : (isDarkMode ? '#e2e8f0' : '#374151'),
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            AI
          </button>
        </div>
      </div>

      {/* Mobile Chat Panel */}
      {showMobileChat && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }}>
            <h3 className="text-base font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>StudyMaxx AI</h3>
            <button onClick={() => setShowMobileChat(false)} className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(26, 115, 232, 0.1)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="font-medium mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>Ask me anything about your document!</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: msg.role === "user" ? "#1a73e8" : isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)", color: msg.role === "user" ? "#ffffff" : "#1a73e8" }}>
                    {msg.role === "user" ? "You" : "AI"}
                  </div>
                  <div className="flex-1 text-sm leading-relaxed" style={{ color: isDarkMode ? "#e2e8f0" : "#1e293b" }}>{msg.text}</div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)" }}>
                  <SpinnerIcon />
                </div>
                <div className="text-sm" style={{ color: isDarkMode ? "#9aa0a6" : "#64748b" }}>Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()} placeholder="Ask about your document..." className="flex-1 bg-transparent border-none outline-none text-sm" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }} disabled={isChatLoading} />
              <button onClick={handleSendChat} disabled={!chatMessage.trim() || isChatLoading} className="p-2 rounded-lg transition-all disabled:opacity-50" style={{ backgroundColor: "#1a73e8", color: "#ffffff" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      <CustomizeGenerationModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        onGenerate={handleGenerateWithSettings}
        generationType={pendingGenerationType || "flashcards"}
        isGenerating={isGenerating}
        isPremium={isPremium}
        isDarkMode={isDarkMode}
      />

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="text-center max-w-sm w-full mx-4 p-8 rounded-2xl" style={{ backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.95)' : 'rgba(255,255,255,0.95)' }}>
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              Creating your study set...
            </h3>
            <p className="text-sm mb-5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              This usually takes 10-30 seconds
            </p>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs font-medium mb-1.5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                <span>{elapsedSeconds < 10 ? 'Analyzing...' : elapsedSeconds < 25 ? 'Generating...' : 'Finalizing...'}</span>
                <span>{Math.min(Math.round((elapsedSeconds / 35) * 100), 95)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min((elapsedSeconds / 35) * 100, 95)}%`,
                    background: 'linear-gradient(90deg, #06b6d4, #a855f7, #06b6d4)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2 text-left">
              {[
                { label: 'Analyzing content', time: 0 },
                { label: 'Generating flashcards', time: 10 },
                { label: 'Finalizing study set', time: 25 },
              ].map((step, i) => {
                const isDone = elapsedSeconds >= [10, 25, 60][i];
                const isActive = elapsedSeconds >= step.time && !isDone;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300" style={{
                    backgroundColor: isActive ? (isDarkMode ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.05)') : 'transparent',
                  }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{
                      backgroundColor: isDone ? '#22c55e' : isActive ? '#06b6d4' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                      color: isDone || isActive ? '#ffffff' : (isDarkMode ? '#64748b' : '#94a3b8'),
                    }}>
                      {isDone ? '✓' : isActive ? <span className="animate-pulse">•</span> : (i + 1)}
                    </div>
                    <span className="text-sm font-medium" style={{
                      color: isDone ? '#22c55e' : isActive ? (isDarkMode ? '#ffffff' : '#000000') : (isDarkMode ? '#64748b' : '#94a3b8'),
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}

