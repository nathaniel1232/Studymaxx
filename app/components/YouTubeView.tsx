"use client";

import { useState, useRef, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { generateFlashcards, Flashcard } from "../utils/flashcardGenerator";
import { saveFlashcardSet } from "../utils/storage";
import CustomizeGenerationModal, { GenerationSettings } from "./CustomizeGenerationModal";

interface YouTubeViewProps {
  onBack: () => void;
  onContentExtracted: (text: string, subject: string, title: string) => void;
  onGenerateFlashcards?: (cards: Flashcard[], subject: string, grade: string) => void;
  onGenerateQuiz?: (questions: any[], subject: string) => void;
  onGenerateMatch?: (terms: string[], definitions: string[], subject: string) => void;
  isPremium?: boolean;
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

export default function YouTubeView({ 
  onBack, 
  onContentExtracted,
  onGenerateFlashcards,
  onGenerateQuiz,
  onGenerateMatch,
  isPremium,
  user,
  initialSubject = ""
}: YouTubeViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [error, setError] = useState("");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  
  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [pendingGenerationType, setPendingGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [savedTranscripts, setSavedTranscripts] = useState<any[]>([]);
  const [showSavedTranscripts, setShowSavedTranscripts] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Loading timer
  useEffect(() => {
    if (!isGenerating) { setElapsedSeconds(0); return; }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load saved transcripts list on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('studymaxx_youtube_transcripts') || '[]');
      setSavedTranscripts(saved);
    } catch (err) {
      console.error("Failed to load saved transcripts:", err);
    }
  }, []); // Only run once on mount

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-save transcript
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (!extractedContent || extractedContent.length < 50) return;

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveTranscript();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [extractedContent, subject, videoTitle]);

  const saveTranscript = async () => {
    if (!extractedContent) return;
    
    setIsSaving(true);
    try {
      const transcriptData = {
        id: `yt-${Date.now()}`,
        url: url,
        title: videoTitle || "YouTube Video",
        content: extractedContent,
        subject: subject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const savedTranscripts = JSON.parse(localStorage.getItem('studymaxx_youtube_transcripts') || '[]');
      const existingIndex = savedTranscripts.findIndex((t: any) => t.url === url);
      
      if (existingIndex >= 0) {
        savedTranscripts[existingIndex] = transcriptData;
      } else {
        savedTranscripts.unshift(transcriptData);
      }
      
      localStorage.setItem('studymaxx_youtube_transcripts', JSON.stringify(savedTranscripts.slice(0, 50)));
      setSavedTranscripts(savedTranscripts.slice(0, 50)); // Update the list
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save transcript:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const isValidUrl = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.includes('youtube.com') || 
             urlObj.hostname.includes('youtu.be') ||
             urlObj.hostname.length > 0;
    } catch {
      return false;
    }
  };

  const isYouTubeUrl = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
    } catch {
      return false;
    }
  };

  const extractContent = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsExtracting(true);
    setError("");

    try {
      const isYT = isYouTubeUrl(url);
      const endpoint = isYT ? '/api/youtube-transcript' : '/api/extract-website';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || (isYT ? 'Failed to extract transcript' : 'Failed to extract page content');
        const suggestion = errorData.suggestion || '';
        throw new Error(suggestion ? `${errorMessage}. ${suggestion}` : errorMessage);
      }

      const data = await response.json();
      setExtractedContent(data.text || '');
      setVideoTitle(data.title || (isYT ? 'YouTube Video' : 'Web Page'));
      
      if (data.title) {
        setSubject(data.title.split(/[-|:]/)[0].trim());
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'Failed to extract content from this URL.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async (type: "flashcards" | "quiz" | "match") => {
    if (!extractedContent.trim()) {
      setError("Please extract content first");
      return;
    }

    if (extractedContent.length < 50) {
      setError("Content too short. Try a longer video.");
      return;
    }

    // Open customize modal instead of generating directly
    setPendingGenerationType(type);
    setShowCustomizeModal(true);
    setError("");
  };

  const handleGenerateWithSettings = async (settings: GenerationSettings) => {
    if (!pendingGenerationType) return;
    
    const type = pendingGenerationType;
    setShowCustomizeModal(false);
    setIsGenerating(true);
    setGenerationType(type);
    setError("");

    try {
      const countToGenerate = type === "match" 
        ? settings.matchPairs 
        : settings.count;

      const cards = await generateFlashcards(
        extractedContent,
        countToGenerate,
        subject || "Video Notes",
        "B",
        user?.id || "anonymous",
        "notes",
        settings.outputLanguage || "auto",
        settings.difficulty,
        false,
        undefined,
        undefined
      );

      if (type === "flashcards" && onGenerateFlashcards) {
        // Auto-save flashcards
        try {
          await saveFlashcardSet(
            subject || "Video Notes",
            cards,
            subject || "Video Notes",
            "B"
          );
          console.log('[YouTube] ✅ Auto-saved flashcards:', cards.length);
        } catch (saveErr) {
          console.error('[YouTube] Failed to auto-save flashcards:', saveErr);
        }
        onGenerateFlashcards(cards, subject || "Video Notes", "B");
      } else if (type === "quiz" && onGenerateQuiz) {
        const quizQuestions = cards.map(card => {
          const correctAnswer = card.answer;
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
        
        onGenerateQuiz(quizQuestions, subject || "Video Notes");
      } else if (type === "match" && onGenerateMatch) {
        const terms = cards.map(c => c.question);
        const definitions = cards.map(c => c.answer);
        onGenerateMatch(terms, definitions, subject || "Video Notes");
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

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatLoading) return;

    const userMessage = chatMessage.trim();
    setChatMessage("");
    const updatedMessages = [...chatMessages, { role: "user" as const, text: userMessage }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    const aiMessageIndex = updatedMessages.length;
    setChatMessages(prev => [...prev, { role: "ai" as const, text: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId: user?.id || "anonymous",
          context: extractedContent.substring(0, 3000),
          history: chatMessages.map(m => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

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
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[aiMessageIndex] = { role: "ai", text: fullResponse };
                    return updated;
                  });
                }
              } catch (e) {}
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

  const handleContinue = () => {
    if (extractedContent && subject) {
      onContentExtracted(extractedContent, subject, videoTitle);
    }
  };

  const showSidebar = !!extractedContent;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: isDarkMode ? "#1a1a2e" : "#f1f5f9" }}>
      {/* Main Content Area */}
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
                style={{ background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <h1 className="text-lg font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                YouTube & Web
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedTranscripts.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSavedTranscripts(!showSavedTranscripts)}
                  className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: isDarkMode ? "#ffffff" : "#000000",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M3 6h18M3 18h18"/>
                  </svg>
                  Saved ({savedTranscripts.length})
                </button>
                {showSavedTranscripts && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-2xl z-50"
                    style={{
                      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    }}
                  >
                    <div className="p-3 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>Saved Transcripts</h4>
                        <button onClick={() => setShowSavedTranscripts(false)} className="text-sm" style={{ color: isDarkMode ? "#9aa0a6" : "#64748b" }}>Close</button>
                      </div>
                    </div>
                    {savedTranscripts.map((transcript, index) => (
                      <button
                        key={transcript.id}
                        onClick={() => {
                          setUrl(transcript.url);
                          setVideoTitle(transcript.title);
                          setExtractedContent(transcript.content);
                          setSubject(transcript.subject || "");
                          setShowSavedTranscripts(false);
                        }}
                        className="w-full p-3 text-left border-b transition-all duration-200 hover:bg-opacity-50"
                        style={{
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                              {transcript.title}
                            </div>
                            <div className="text-xs mt-1" style={{ color: isDarkMode ? "#9aa0a6" : "#64748b" }}>
                              {index === 0 ? '📝 Latest' : '🕐 Old version'} • {new Date(transcript.createdAt).toLocaleDateString()}
                            </div>
                            {transcript.subject && (
                              <div className="text-xs mt-1 px-2 py-0.5 rounded inline-block" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                {transcript.subject}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {extractedContent && (
              <button
                onClick={handleContinue}
                disabled={!subject}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: "#1a73e8",
                  color: "#ffffff",
                }}
              >
                Open in Notes Editor →
              </button>
            )}
          </div>
        </div>

        {/* Subject Input */}
        {extractedContent && (
          <div 
            className="px-6 py-3 border-b flex items-center gap-3" 
            style={{ 
              backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.5)" : "rgba(241, 245, 249, 0.95)",
              borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" 
            }}
          >
            <span className="text-sm font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#64748b" }}>Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (e.g., Biology, History, Math)"
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
              style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
            />
            {lastSaved && (
              <span className="text-xs whitespace-nowrap" style={{ color: isDarkMode ? "#5f6368" : "#94a3b8" }}>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* URL Input Section */}
          {!extractedContent && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <p style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  Paste a YouTube video or website URL to extract content
                </p>
              </div>

              <div 
                className="p-6 rounded-2xl transition-all duration-200"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', 
                  border: url.trim() ? '2px solid #1a73e8' : (isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)'),
                  boxShadow: url.trim() ? '0 0 0 3px rgba(26, 115, 232, 0.1)' : 'none'
                }}
              >
                <label className="block text-sm font-medium mb-3" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                  Paste URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or any website"
                    className="w-full px-4 py-3 rounded-xl outline-none mb-2 transition-all duration-200"
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
                      color: isDarkMode ? '#ffffff' : '#000000',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}
                  />
                  {url.trim() && (
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="h-1 flex-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      >
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: '100%',
                            background: 'linear-gradient(90deg, #1a73e8, #34a853)'
                          }}
                        />
                      </div>
                      <span 
                        className="text-xs font-medium"
                        style={{ color: '#1a73e8' }}
                      >
                        Ready to extract
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={extractContent}
                  disabled={isExtracting || !url.trim()}
                  className="w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:shadow-lg hover:scale-[1.02]"
                  style={{ backgroundColor: '#1a73e8', color: '#ffffff', boxShadow: '0 2px 8px rgba(26, 115, 232, 0.3)' }}
                >
                  {isExtracting ? (
                    <span className="flex items-center justify-center gap-2">
                      <SpinnerIcon />
                      Extracting content...
                    </span>
                  ) : 'Extract Content'}
                </button>
              </div>

              {/* Tips */}
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', border: '1px solid rgba(26, 115, 232, 0.2)' }}
              >
                <h4 className="font-medium mb-2" style={{ color: isDarkMode ? '#4285f4' : '#1a73e8' }}>💡 Tips</h4>
                <ul className="text-sm space-y-1" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  <li>• Works with YouTube videos (extracts transcript)</li>
                  <li>• Works with articles and blog posts</li>
                  <li>• Works with Wikipedia pages</li>
                  <li>• Longer videos may take more time</li>
                </ul>
              </div>
            </div>
          )}

          {/* Extracted Content Display */}
          {extractedContent && (
            <div className="space-y-4">
              {/* Video Title */}
              {videoTitle && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)' }}>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Source:</p>
                  <p className="font-medium" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{videoTitle}</p>
                </div>
              )}

              {/* Content Preview */}
              <div className="p-6 rounded-2xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Extracted Content</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#22c55e' }}>
                      ✓ {extractedContent.split(' ').length} words
                    </span>
                    <button
                      onClick={() => {
                        setExtractedContent("");
                        setUrl("");
                        setVideoTitle("");
                        setChatMessages([]);
                      }}
                      className="text-sm px-3 py-1 rounded-lg"
                      style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                    >
                      Try Another
                    </button>
                  </div>
                </div>
                <div 
                  className="max-h-[60vh] overflow-y-auto p-4 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#e2e8f0' : '#1e293b' }}
                >
                  {extractedContent}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <div className="w-96 border-l flex flex-col"
          style={{ backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.5)" : "rgba(241, 245, 249, 0.95)", borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}
        >
          {/* Action Buttons */}
          <div className="p-4 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: isDarkMode ? "#e8eaed" : "#0f172a" }}>Create from Video</h3>
            
            <div className="space-y-2">
              <button onClick={() => handleGenerate("flashcards")} disabled={isGenerating} className="w-full px-4 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1a73e8 0%, #06b6d4 100%)", color: "#ffffff", boxShadow: "0 4px 14px rgba(26, 115, 232, 0.3)", opacity: isGenerating && generationType === "flashcards" ? 0.8 : 1 }}
              >{isGenerating && generationType === "flashcards" ? <SpinnerIcon /> : <FlashcardIcon />}Create Study Set</button>
            </div>
          </div>

          {/* AI Chat */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
              <h3 className="text-base font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>StudyMaxx AI</h3>
              <p className="text-xs" style={{ color: isDarkMode ? "#9aa0a6" : "#475569" }}>Ask questions about the video</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(26, 115, 232, 0.1)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <p className="font-medium mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>Ask me about the video!</p>
                  <p className="text-xs" style={{ color: isDarkMode ? "#9aa0a6" : "#475569" }}>"What are the main points?" • "Explain this concept"</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: msg.role === "user" ? "#1a73e8" : isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)", color: msg.role === "user" ? "#ffffff" : "#1a73e8" }}
                    >{msg.role === "user" ? "You" : "AI"}</div>
                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>{msg.role === "user" ? "You" : "StudyMaxx AI"}</div>
                      <div className="text-sm leading-relaxed" style={{ color: isDarkMode ? "#e2e8f0" : "#1e293b" }}>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && chatMessages[chatMessages.length - 1]?.text === "" && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)", color: "#1a73e8" }}>AI</div>
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>StudyMaxx AI</div>
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

            <div className="p-4 border-t" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" }}>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)" }}
              >
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  placeholder="Ask about the video..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                />
                <button onClick={handleChatSubmit} disabled={isChatLoading || !chatMessage.trim()} className="p-2 rounded-lg transition-all hover:scale-110 disabled:opacity-50" style={{ color: "#1a73e8" }}>
                  {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}



