"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { Flashcard, generateFlashcards } from "../utils/flashcardGenerator";
import { saveFlashcardSet } from "../utils/storage";
import { supabase, getCurrentUser } from "../utils/supabase";

interface NotesEditorViewProps {
  onBack: () => void;
  onGenerateFlashcards: (cards: Flashcard[], subject: string, grade: string) => void;
  onGenerateQuiz?: (questions: any[], subject: string) => void;
  onGenerateMatch?: (terms: string[], definitions: string[], subject: string) => void;
  isPremium: boolean;
  user?: any;
  initialText?: string;
  initialSubject?: string;
}

interface SavedDocument {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  flashcards?: Flashcard[];
  quizQuestions?: any[];
  matchData?: { terms: string[]; definitions: string[] };
}

interface GenerationSettings {
  count: number;
  difficulty: "Easy" | "Medium" | "Hard";
  matchPairs: number;
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

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function NotesEditorView({
  onBack,
  onGenerateFlashcards,
  onGenerateQuiz,
  onGenerateMatch,
  isPremium,
  user,
  initialText = "",
  initialSubject = "",
}: NotesEditorViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Document state
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [documentContent, setDocumentContent] = useState(initialText);
  const [subject, setSubject] = useState(initialSubject);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  const [error, setError] = useState("");

  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [pendingGenerationType, setPendingGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    count: 15,
    difficulty: "Medium",
    matchPairs: 8,
  });

  // Generated content state (saved to document)
  const [savedFlashcards, setSavedFlashcards] = useState<Flashcard[]>([]);
  const [savedQuizQuestions, setSavedQuizQuestions] = useState<any[]>([]);
  const [savedMatchData, setSavedMatchData] = useState<{ terms: string[]; definitions: string[] } | null>(null);

  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved documents on mount
  useEffect(() => {
    loadSavedDocuments();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-save functionality - saves 2 seconds after user stops typing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Don't auto-save if there's no content
    if (!documentContent.trim()) return;

    // Set a new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSaveDocument();
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [documentContent, documentTitle, subject]); // Trigger on content changes

  const loadSavedDocuments = async () => {
    if (!supabase || !user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (data) {
        setSavedDocuments(data.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          subject: doc.subject || "",
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
        })));
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const handleSaveDocument = async () => {
    if (!documentContent.trim()) {
      setError("Document is empty");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (!supabase || !user) {
        // Save to localStorage for non-logged in users
        const docs = JSON.parse(localStorage.getItem("studymaxx_documents") || "[]");
        const docId = savedDocumentId || `doc_${Date.now()}`;
        
        const docIndex = docs.findIndex((d: any) => d.id === docId);
        const docData = {
          id: docId,
          title: documentTitle,
          content: documentContent,
          subject,
          createdAt: docIndex >= 0 ? docs[docIndex].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (docIndex >= 0) {
          docs[docIndex] = docData;
        } else {
          docs.unshift(docData);
        }

        localStorage.setItem("studymaxx_documents", JSON.stringify(docs));
        setSavedDocumentId(docId);
        setLastSaved(new Date());
        return;
      }

      if (savedDocumentId) {
        // Update existing document
        const { error } = await supabase
          .from("user_documents")
          .update({
            title: documentTitle,
            content: documentContent,
            subject,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedDocumentId);
        
        if (error) throw error;
      } else {
        // Create new document
        const { data, error } = await supabase
          .from("user_documents")
          .insert({
            user_id: user.id,
            title: documentTitle,
            content: documentContent,
            subject,
          })
          .select()
          .single();
        
        if (error) throw error;
        setSavedDocumentId(data.id);
      }
      
      setLastSaved(new Date());
      await loadSavedDocuments();
    } catch (err: any) {
      console.error("Save failed:", err);
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDocument = (doc: SavedDocument) => {
    setDocumentTitle(doc.title);
    setDocumentContent(doc.content);
    setSubject(doc.subject);
    setSavedDocumentId(doc.id);
    setShowDocumentList(false);
    // Load saved generated content
    if (doc.flashcards) setSavedFlashcards(doc.flashcards);
    if (doc.quizQuestions) setSavedQuizQuestions(doc.quizQuestions);
    if (doc.matchData) setSavedMatchData(doc.matchData);
  };

  const handleNewDocument = () => {
    setDocumentTitle("Untitled Document");
    setDocumentContent("");
    setSubject("");
    setSavedDocumentId(null);
    // Clear saved content
    setSavedFlashcards([]);
    setSavedQuizQuestions([]);
    setSavedMatchData(null);
    setShowDocumentList(false);
  };

  // Open customization modal before generating
  const openCustomizeModal = (type: "flashcards" | "quiz" | "match") => {
    if (!documentContent.trim()) {
      setError("Please add some notes first");
      return;
    }
    if (documentContent.length < 50) {
      setError("Please add more content to generate from (at least 50 characters)");
      return;
    }
    setPendingGenerationType(type);
    setShowCustomizeModal(true);
    setError("");
  };

  const handleGenerate = async () => {
    if (!pendingGenerationType) return;
    
    const type = pendingGenerationType;
    setShowCustomizeModal(false);
    setIsGenerating(true);
    setGenerationType(type);
    setError("");

    try {
      const countToGenerate = type === "match" 
        ? generationSettings.matchPairs 
        : generationSettings.count;

      const cards = await generateFlashcards(
        documentContent,
        countToGenerate,
        subject || "General",
        "B",
        user?.id || "anonymous",
        "notes",
        "auto",
        generationSettings.difficulty,
        false,
        undefined,
        undefined
      );

      if (type === "flashcards") {
        setSavedFlashcards(cards); // Save to document
        // Auto-save flashcards to database/storage
        try {
          await saveFlashcardSet(
            subject || "Study Notes",
            cards,
            subject || "Study Notes",
            "B"
          );
          console.log('[NotesEditor] ✅ Auto-saved flashcards:', cards.length);
        } catch (saveErr) {
          console.error('[NotesEditor] Failed to auto-save flashcards:', saveErr);
        }
        onGenerateFlashcards(cards, subject || "Study Notes", "B");
      } else if (type === "quiz") {
        // Convert flashcards to quiz questions with multiple choice
        const quizQuestions = cards.map(card => {
          const correctAnswer = card.answer;
          // Generate 3 wrong answers from other cards
          const otherAnswers = cards
            .filter(c => c.id !== card.id)
            .map(c => c.answer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          
          const allOptions = [correctAnswer, ...otherAnswers]
            .sort(() => Math.random() - 0.5);
          
          return {
            id: card.id,
            question: card.question,
            correctAnswer: correctAnswer,
            options: allOptions,
          };
        });
        
        setSavedQuizQuestions(quizQuestions); // Save to document
        if (onGenerateQuiz) {
          onGenerateQuiz(quizQuestions, subject || "Study Notes");
        }
      } else if (type === "match") {
        const terms = cards.map(c => c.question);
        const definitions = cards.map(c => c.answer);
        
        setSavedMatchData({ terms, definitions }); // Save to document
        if (onGenerateMatch) {
          onGenerateMatch(terms, definitions, subject || "Study Notes");
        }
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(err.message || "Failed to generate content");
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
      setPendingGenerationType(null);
    }
  };

  // Load saved flashcards/quiz/match without regenerating
  const loadSavedContent = (type: "flashcards" | "quiz" | "match") => {
    if (type === "flashcards" && savedFlashcards.length > 0) {
      onGenerateFlashcards(savedFlashcards, subject || "Study Notes", "B");
    } else if (type === "quiz" && savedQuizQuestions.length > 0 && onGenerateQuiz) {
      onGenerateQuiz(savedQuizQuestions, subject || "Study Notes");
    } else if (type === "match" && savedMatchData && onGenerateMatch) {
      onGenerateMatch(savedMatchData.terms, savedMatchData.definitions, subject || "Study Notes");
    }
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatLoading) return;

    const userMessage = chatMessage.trim();
    setChatMessage("");
    const updatedMessages = [...chatMessages, { role: "user" as const, text: userMessage }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    // Add placeholder for AI response
    const aiMessageIndex = updatedMessages.length;
    setChatMessages(prev => [...prev, { role: "ai" as const, text: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId: user?.id || "anonymous",
          context: documentContent.substring(0, 3000),
          history: chatMessages.map(m => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullResponse += parsed.text;
                  // Update the AI message in real-time
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[aiMessageIndex] = { role: "ai", text: fullResponse };
                    return updated;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[aiMessageIndex] = { 
          role: "ai", 
          text: "Oops! Something went wrong. Please try again." 
        };
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: isDarkMode ? "#1a1a2e" : "#f1f5f9" }}>
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Accent Strip - Notes Green/Blue theme */}
        <div 
          className="h-1" 
          style={{ 
            background: "linear-gradient(90deg, #1a73e8, #34a853, #10b981)" 
          }}
        />
        
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
              className="p-2 rounded-lg transition-all hover:scale-105"
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
                style={{ background: "linear-gradient(135deg, #1a73e8 0%, #34a853 100%)" }}
              >
                <span className="text-lg">📝</span>
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
              onClick={() => setShowDocumentList(!showDocumentList)}
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                color: isDarkMode ? "#5f6368" : "#5f6368",
              }}
              title="My Documents"
            >
              <DocumentIcon />
            </button>
            
            <button
              onClick={handleSaveDocument}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105"
              style={{
                backgroundColor: "#1a73e8",
                color: "#ffffff",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? <SpinnerIcon /> : <SaveIcon />}
              Save
            </button>
          </div>
        </div>

        {/* Document List Dropdown */}
        {showDocumentList && (
          <div
            className="absolute top-16 right-4 z-40 w-72 rounded-xl shadow-2xl border overflow-hidden"
            style={{
              backgroundColor: isDarkMode ? "#0f1d32" : "#ffffff",
              borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            }}
          >
            <div className="p-3 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
              <button
                onClick={handleNewDocument}
                className="w-full px-3 py-2 rounded-lg text-left font-medium transition-all"
                style={{
                  backgroundColor: "rgba(26, 115, 232, 0.15)",
                  color: "#1a73e8",
                }}
              >
                + New Document
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {savedDocuments.length === 0 ? (
                <p className="p-4 text-sm text-center" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  No saved documents
                </p>
              ) : (
                savedDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleLoadDocument(doc)}
                    className="w-full px-4 py-3 text-left border-b transition-all hover:bg-opacity-10"
                    style={{
                      borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      color: isDarkMode ? "#ffffff" : "#000000",
                    }}
                  >
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-xs" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Subject Input */}
        <div className="px-6 py-3 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g., Biology, History, Math)"
            className="w-full bg-transparent border-none outline-none text-sm"
            style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6">
          <textarea
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)}
            placeholder="Paste your notes here, or start typing...

Tips:
• Add your class notes, lecture summaries, or study material
• Use the buttons on the right to generate flashcards, quizzes, or match games
• Ask the AI assistant questions about your notes"
            className="w-full h-full min-h-[60vh] p-4 rounded-xl resize-none outline-none text-base leading-relaxed"
            style={{
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#ffffff",
              color: isDarkMode ? "#ffffff" : "#000000",
              border: isDarkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
            }}
          />
          
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
          
          {lastSaved && (
            <p className="mt-2 text-xs" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Right Sidebar - Actions & Chat */}
      <div
        className="w-96 border-l flex flex-col"
        style={{
          backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.5)" : "rgba(241, 245, 249, 0.95)",
          borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
        }}
      >
        {/* Action Buttons */}
        <div className="p-4 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: isDarkMode ? "#e8eaed" : "#0f172a" }}>
            Create from Notes
          </h3>
          
          <div className="space-y-2">
            {/* Create Study Set - Primary CTA */}
            <button
              onClick={() => openCustomizeModal("flashcards")}
              disabled={isGenerating}
              className="w-full px-4 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #1a73e8 0%, #06b6d4 100%)",
                color: "#ffffff",
                opacity: isGenerating && generationType === "flashcards" ? 0.8 : 1,
                boxShadow: "0 4px 14px rgba(26, 115, 232, 0.3)",
              }}
            >
              {isGenerating && generationType === "flashcards" ? <SpinnerIcon /> : <FlashcardIcon />}
              Create Study Set
            </button>

            {/* Saved content buttons */}
            {(savedFlashcards.length > 0 || savedQuizQuestions.length > 0 || savedMatchData) && (
              <div className="pt-2 mt-1 border-t flex gap-2" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
                {savedFlashcards.length > 0 && (
                  <button
                    onClick={() => loadSavedContent("flashcards")}
                    className="flex-1 px-2 py-2 rounded-lg text-xs transition-all hover:scale-105"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      color: "#16a34a",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                    title={`Load saved (${savedFlashcards.length} cards)`}
                  >
                    📚 {savedFlashcards.length} cards
                  </button>
                )}
                {savedQuizQuestions.length > 0 && (
                  <button
                    onClick={() => loadSavedContent("quiz")}
                    className="flex-1 px-2 py-2 rounded-lg text-xs transition-all hover:scale-105"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      color: "#16a34a",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                    title={`Load saved (${savedQuizQuestions.length} questions)`}
                  >
                    📝 {savedQuizQuestions.length} Qs
                  </button>
                )}
                {savedMatchData && (
                  <button
                    onClick={() => loadSavedContent("match")}
                    className="flex-1 px-2 py-2 rounded-lg text-xs transition-all hover:scale-105"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      color: "#16a34a",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                    title={`Load saved (${savedMatchData.terms.length} pairs)`}
                  >
                    🎮 {savedMatchData.terms.length} pairs
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Settings hint */}
          <p className="text-xs mt-3 text-center" style={{ color: isDarkMode ? "#9aa0a6" : "#475569" }}>
            Click a button to customize count & difficulty
          </p>
        </div>

        {/* AI Chat */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
            <h3 className="text-base font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
              StudyMaxx AI
            </h3>
            <p className="text-xs" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              Ask questions about your notes
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
                  Ask me anything about your notes!
                </p>
                <p className="text-xs" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  "What is photosynthesis?" • "Explain this concept"
                </p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="flex gap-3 items-start">
                  {/* Avatar */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      backgroundColor: msg.role === "user" ? "#1a73e8" : isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)",
                      color: msg.role === "user" ? "#ffffff" : "#1a73e8"
                    }}
                  >
                    {msg.role === "user" ? "You" : "AI"}
                  </div>
                  
                  {/* Message */}
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>
                      {msg.role === "user" ? "You" : "StudyMaxx AI"}
                    </div>
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
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)",
                    color: "#1a73e8"
                  }}
                >
                  AI
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>
                    StudyMaxx AI
                  </div>
                  <div className="flex gap-1 py-1">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a73e8', animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a73e8', animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a73e8', animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                placeholder="Ask about your notes..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
              />
              <button
                onClick={handleChatSubmit}
                disabled={isChatLoading || !chatMessage.trim()}
                className="p-2 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                style={{ color: "#1a73e8" }}
              >
                {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      {showCustomizeModal && pendingGenerationType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: isDarkMode ? "#0f1d32" : "#ffffff",
              border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            }}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b"
              style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}
            >
              <h3 className="text-lg font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                {pendingGenerationType === "flashcards" && "🎴 Generate Flashcards"}
                {pendingGenerationType === "quiz" && "📝 Generate Quiz"}
                {pendingGenerationType === "match" && "🎮 Match Game Settings"}
              </h3>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  color: isDarkMode ? "#5f6368" : "#5f6368",
                }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Count Selection */}
              <div>
                <label
                  className="block text-sm font-semibold mb-3"
                  style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                >
                  {pendingGenerationType === "match" ? "Number of Pairs" : "Number of Cards"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(pendingGenerationType === "match" 
                    ? [4, 6, 8, 10, 12, 15]
                    : [5, 10, 15, 20, 30, 50]
                  ).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        if (pendingGenerationType === "match") {
                          setGenerationSettings(s => ({ ...s, matchPairs: num }));
                        } else {
                          setGenerationSettings(s => ({ ...s, count: num }));
                        }
                      }}
                      className="px-3 py-3 rounded-xl font-bold text-lg transition-all hover:scale-105"
                      style={{
                        backgroundColor: (pendingGenerationType === "match" 
                          ? generationSettings.matchPairs === num
                          : generationSettings.count === num)
                          ? "#1a73e8"
                          : isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                        color: (pendingGenerationType === "match" 
                          ? generationSettings.matchPairs === num
                          : generationSettings.count === num)
                          ? "#ffffff"
                          : isDarkMode ? "#ffffff" : "#000000",
                        border: (pendingGenerationType === "match" 
                          ? generationSettings.matchPairs === num
                          : generationSettings.count === num)
                          ? "2px solid #1a73e8"
                          : `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                {!isPremium && (pendingGenerationType !== "match" ? generationSettings.count > 15 : generationSettings.matchPairs > 10) && (
                  <p className="text-xs mt-2 text-amber-500">
                    ⭐ Premium required for more than {pendingGenerationType === "match" ? "10 pairs" : "15 cards"}
                  </p>
                )}
              </div>

              {/* Difficulty Selection */}
              <div>
                <label
                  className="block text-sm font-semibold mb-3"
                  style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                >
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Easy", "Medium", "Hard"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setGenerationSettings(s => ({ ...s, difficulty: level }))}
                      className="px-4 py-3 rounded-xl font-medium transition-all hover:scale-105"
                      style={{
                        backgroundColor: generationSettings.difficulty === level
                          ? level === "Easy" ? "rgba(34, 197, 94, 0.2)"
                            : level === "Medium" ? "rgba(26, 115, 232, 0.2)"
                            : "rgba(239, 68, 68, 0.2)"
                          : isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                        color: generationSettings.difficulty === level
                          ? level === "Easy" ? "#22c55e"
                            : level === "Medium" ? "#1a73e8"
                            : "#ef4444"
                          : isDarkMode ? "#ffffff" : "#000000",
                        border: generationSettings.difficulty === level
                          ? `2px solid ${level === "Easy" ? "#22c55e" : level === "Medium" ? "#1a73e8" : "#ef4444"}`
                          : `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  {generationSettings.difficulty === "Easy" && "Basic recall questions, shorter answers"}
                  {generationSettings.difficulty === "Medium" && "Balanced mix of concepts and details"}
                  {generationSettings.difficulty === "Hard" && "Complex concepts, requires deep understanding"}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="px-6 py-4 border-t flex gap-3"
              style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}
            >
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                style={{
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  color: isDarkMode ? "#ffffff" : "#000000",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 px-4 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  backgroundColor: "#1a73e8",
                  color: "#ffffff",
                  opacity: isGenerating ? 0.7 : 1,
                }}
              >
                {isGenerating ? (
                  <>
                    <SpinnerIcon /> Generating...
                  </>
                ) : (
                  <>
                    ✨ Generate {pendingGenerationType === "match" 
                      ? `${generationSettings.matchPairs} Pairs` 
                      : `${generationSettings.count} Cards`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


