"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Flashcard, saveFlashcardSet, shuffleArray, getSavedFlashcardSets } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";
import { getCurrentUser } from "../utils/supabase";
import { recordStudySession } from "../utils/streak";
import LoginModal from "./LoginModal";

// ─── Types ───────────────────────────────────────────────────
type ActiveTab = "flashcards" | "quiz" | "match";
type QuizMode = "multiple-choice" | "written";

interface StudyViewProps {
  flashcards: Flashcard[];
  currentSetId: string | null;
  onBack: () => void;
  isPremium?: boolean;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

// ─── Levenshtein distance for fuzzy matching ─────────────────
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(userAnswer: string, correctAnswer: string): boolean {
  const a = userAnswer.trim().toLowerCase();
  const b = correctAnswer.trim().toLowerCase();
  if (a === b) return true;
  // Allow 1 typo per 5 chars, min 1
  const maxDist = Math.max(1, Math.floor(b.length / 5));
  return levenshtein(a, b) <= maxDist;
}

// ─── Icons ───────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const ShuffleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const FlashcardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 8h10" /><path d="M7 12h6" />
  </svg>
);
const QuizIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const MatchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
  </svg>
);
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

// ─── Main Component ──────────────────────────────────────────
export default function StudyView({ flashcards: initialFlashcards, currentSetId, onBack, isPremium = false }: StudyViewProps) {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Core state
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [originalFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("flashcards");

  // Rating state
  const [cardRatings, setCardRatings] = useState<Map<string, 'bad' | 'ok' | 'good'>>(new Map());

  // Quiz state
  const [quizMode, setQuizMode] = useState<QuizMode>("multiple-choice");
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(0);
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [writtenSubmitted, setWrittenSubmitted] = useState(false);
  const [showQuizModeSelector, setShowQuizModeSelector] = useState(true);

  // Match state
  const [matchCards, setMatchCards] = useState<Array<{ id: string; text: string; type: 'term' | 'def'; pairId: string }>>([]);
  const [matchSelected, setMatchSelected] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [matchWrong, setMatchWrong] = useState<string | null>(null);
  const [matchAttempts, setMatchAttempts] = useState(0);
  const [matchTimer, setMatchTimer] = useState(0);
  const [matchCardCount, setMatchCardCount] = useState(8);
  const matchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [setName, setSetName] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // AI Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentCard = flashcards[currentIndex];

  // ─── Keyboard navigation ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSaveDialog || showLoginModal || showChat) return;
      if (activeTab !== "flashcards") return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex > 0) { setCurrentIndex(i => i - 1); setIsFlipped(false); }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex < flashcards.length - 1) { setCurrentIndex(i => i + 1); setIsFlipped(false); }
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          setIsFlipped(f => !f);
          break;
        case "1":
          handleRate("bad");
          break;
        case "2":
          handleRate("ok");
          break;
        case "3":
          handleRate("good");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, flashcards.length, activeTab, showSaveDialog, showLoginModal, showChat]);

  // ─── Login check ───────────────────────────────────────────
  useEffect(() => {
    getCurrentUser().then(user => setIsLoggedIn(!!user)).catch(() => {});
  }, []);

  // ─── Reset flip on card change ─────────────────────────────
  useEffect(() => { setIsFlipped(false); }, [currentIndex]);

  // ─── Generate quiz options (only for multiple-choice) ──────
  useEffect(() => {
    if (activeTab !== "quiz" || flashcards.length === 0 || quizMode !== "multiple-choice" || showQuizModeSelector) return;
    const card = flashcards[quizIndex];
    if (!card) return;

    let options: string[];
    if (card.distractors && card.distractors.length >= 3) {
      options = shuffleArray([card.answer, ...card.distractors.slice(0, 3)]);
    } else {
      const otherAnswers = flashcards
        .filter(c => c.id !== card.id)
        .map(c => c.answer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      options = shuffleArray([card.answer, ...otherAnswers]);
    }
    setQuizOptions(options);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
  }, [quizIndex, activeTab, flashcards, quizMode, showQuizModeSelector]);

  // ─── Initialize match game ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== "match") return;
    // Don't auto-start match anymore, let user configure first
    return () => { if (matchTimerRef.current) clearInterval(matchTimerRef.current); };
  }, [activeTab]);

  // ─── Auto-scroll chat ─────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Auto-dismiss toast ────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Record study session for streak tracking ─────────────
  useEffect(() => {
    const setId = currentSetId || `temp-${Date.now()}`;
    const setName = originalFlashcards[0]?.question?.slice(0, 30) || "Study Set";
    recordStudySession(setId, setName);
  }, []);

  const initMatch = () => {
    const pairs = flashcards.slice(0, Math.min(matchCardCount, flashcards.length));
    const cards = pairs.flatMap(card => [
      { id: `t-${card.id}`, text: card.question, type: 'term' as const, pairId: card.id },
      { id: `d-${card.id}`, text: card.answer, type: 'def' as const, pairId: card.id },
    ]);
    setMatchCards(shuffleArray(cards));
    setMatchSelected(null);
    setMatchedPairs(new Set());
    setMatchWrong(null);
    setMatchAttempts(0);
    setMatchTimer(0);
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    matchTimerRef.current = setInterval(() => setMatchTimer(t => t + 1), 1000);
  };

  // ─── Handlers ──────────────────────────────────────────────
  const handleRate = (rating: 'bad' | 'ok' | 'good') => {
    if (!currentCard) return;
    setCardRatings(prev => { const m = new Map(prev); m.set(currentCard.id, rating); return m; });
  };

  const handleShuffle = () => {
    setFlashcards(shuffleArray(flashcards));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleSaveSet = async () => {
    if (!setName.trim()) return;
    try {
      await saveFlashcardSet(setName, originalFlashcards);
      setShowSaveDialog(false);
      setSetName("");
      setToast({ message: "Study set saved!", type: "success" });
      if (!isLoggedIn) setShowLoginModal(true);
    } catch {
      setToast({ message: "Failed to save", type: "error" });
    }
  };

  const handleQuizAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;
    const correct = answer === flashcards[quizIndex].answer;
    setSelectedAnswer(answer);
    setIsAnswerCorrect(correct);
    if (correct) setQuizScore(s => s + 1);
    setQuizAnswered(a => a + 1);
  };

  const handleWrittenSubmit = () => {
    if (writtenSubmitted || !writtenAnswer.trim()) return;
    const correct = isFuzzyMatch(writtenAnswer, flashcards[quizIndex].answer);
    setWrittenSubmitted(true);
    setIsAnswerCorrect(correct);
    if (correct) setQuizScore(s => s + 1);
    setQuizAnswered(a => a + 1);
  };

  const handleQuizNext = () => {
    if (quizIndex < flashcards.length - 1) {
      setQuizIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setWrittenAnswer("");
      setWrittenSubmitted(false);
    }
  };

  const handleQuizRestart = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswered(0);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setWrittenAnswer("");
    setWrittenSubmitted(false);
    setFlashcards(shuffleArray(flashcards));
    setShowQuizModeSelector(true);
  };

  const handleMatchSelect = (cardId: string) => {
    const card = matchCards.find(c => c.id === cardId);
    if (!card || matchedPairs.has(card.pairId)) return;

    if (!matchSelected) {
      setMatchSelected(cardId);
      setMatchWrong(null);
    } else {
      const prevCard = matchCards.find(c => c.id === matchSelected);
      if (!prevCard || prevCard.id === cardId) {
        setMatchSelected(cardId === matchSelected ? null : cardId);
        return;
      }

      setMatchAttempts(a => a + 1);

      if (prevCard.pairId === card.pairId && prevCard.type !== card.type) {
        setMatchedPairs(prev => new Set([...prev, card.pairId]));
        setMatchSelected(null);
        if (matchedPairs.size + 1 >= matchCards.length / 2) {
          if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        }
      } else {
        setMatchWrong(cardId);
        setTimeout(() => {
          setMatchSelected(null);
          setMatchWrong(null);
        }, 600);
      }
    }
  };

  // ─── AI Chat handler (SSE streaming) ──────────────────────
  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;
    setChatInput("");
    
    const newUserMsg = { role: "user" as const, text: msg };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    // Build context from flashcards
    const flashcardContext = flashcards.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n');

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          context: flashcardContext,
          history: chatMessages.map(m => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      if (reader) {
        setChatMessages(prev => [...prev, { role: "ai", text: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  aiText += parsed.text;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "ai", text: aiText };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }

      if (!aiText) {
        setChatMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "ai" && !updated[updated.length - 1].text) {
            updated[updated.length - 1] = { role: "ai", text: "Sorry, I couldn't generate a response. Try again!" };
          }
          return updated;
        });
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ─── Derived ───────────────────────────────────────────────
  const ratingCounts = {
    good: Array.from(cardRatings.values()).filter(r => r === 'good').length,
    ok: Array.from(cardRatings.values()).filter(r => r === 'ok').length,
    bad: Array.from(cardRatings.values()).filter(r => r === 'bad').length,
  };
  const quizComplete = quizAnswered >= flashcards.length && !showQuizModeSelector;
  const matchComplete = matchedPairs.size >= matchCards.length / 2 && matchCards.length > 0;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ─── Styles (cyan accent) ─────────────────────────────────
  const bg = isDark ? '#0f172a' : '#f1f5f9';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const accent = '#06b6d4'; // Cyan!

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, color: textPrimary }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium"
          style={{ backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444' }}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* ─── Top Bar ─── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3"
        style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105" 
          style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary }}>
          <BackIcon /> Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: textSecondary }}>
            {flashcards.length} cards
          </span>
        </div>
      </header>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ─── Center Content ─── */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">

          {/* ═══ FLASHCARD TAB ═══ */}
          {activeTab === "flashcards" && currentCard && (
            <div className="w-full max-w-2xl flex flex-col items-center">
              {/* Counter + Shuffle */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-lg font-bold" style={{ color: textSecondary }}>
                  {currentIndex + 1} / {flashcards.length}
                </span>
                <button onClick={handleShuffle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-105"
                  style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                  <ShuffleIcon /> Shuffle
                </button>
              </div>

              {/* ─── The Card (CYAN themed) ─── */}
              <div 
                onClick={() => setIsFlipped(f => !f)}
                className="w-full cursor-pointer select-none transition-all duration-300 hover:shadow-2xl"
                style={{ perspective: '1000px' }}
              >
                <div className="relative w-full rounded-2xl overflow-hidden transition-all duration-500"
                  style={{
                    minHeight: '320px',
                    background: isFlipped
                      ? (isDark ? 'linear-gradient(145deg, #042f2e 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ecfdf5 0%, #f0fdfa 100%)')
                      : (isDark ? 'linear-gradient(145deg, #083344 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ecfeff 0%, #f0f9ff 100%)'),
                    border: `2px solid ${isFlipped ? '#10b981' : accent}`,
                    boxShadow: isFlipped
                      ? `0 8px 32px ${isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)'}`
                      : `0 8px 32px ${isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.12)'}`,
                  }}>
                  {/* Label */}
                  <div className="absolute top-4 left-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-md"
                      style={{
                        background: isFlipped
                          ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)')
                          : (isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.08)'),
                        color: isFlipped ? '#10b981' : accent,
                      }}>
                      {isFlipped ? 'Answer' : 'Question'}
                    </span>
                  </div>

                  {/* Rating badge */}
                  {cardRatings.get(currentCard.id) && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{
                        background: cardRatings.get(currentCard.id) === 'good' ? 'rgba(34,197,94,0.15)' : cardRatings.get(currentCard.id) === 'ok' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: cardRatings.get(currentCard.id) === 'good' ? '#22c55e' : cardRatings.get(currentCard.id) === 'ok' ? '#f59e0b' : '#ef4444',
                      }}>
                        {cardRatings.get(currentCard.id) === 'good' ? '✓ Good' : cardRatings.get(currentCard.id) === 'ok' ? '~ OK' : '✗ Bad'}
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex items-center justify-center p-8 pt-14" style={{ minHeight: '320px' }}>
                    <p className="text-center text-lg md:text-xl leading-relaxed font-medium"
                      style={{ color: textPrimary, maxWidth: '560px' }}
                      dangerouslySetInnerHTML={{
                        __html: (isFlipped ? currentCard.answer : currentCard.question)
                          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                          .replace(/\*(.*?)\*/g, '<i>$1</i>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>

                  {/* Hint */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="text-xs" style={{ color: textSecondary }}>
                      {isFlipped ? 'Click to see question' : 'Click to reveal answer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Navigation ─── */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button 
                  onClick={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); } }}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                  style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                  <ChevronLeft /> Prev
                </button>
                <button 
                  onClick={() => { if (currentIndex < flashcards.length - 1) { setCurrentIndex(i => i + 1); } }}
                  disabled={currentIndex === flashcards.length - 1}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                  style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                  Next <ChevronRight />
                </button>
              </div>

              {/* ─── Rating Buttons ─── */}
              <div className="flex items-center justify-center gap-3 mt-5">
                {(['bad', 'ok', 'good'] as const).map(rating => {
                  const isActive = cardRatings.get(currentCard.id) === rating;
                  const colors = {
                    bad:  { bg: isActive ? '#ef4444' : (isDark ? '#1e293b' : '#fff'), border: '#ef4444', text: isActive ? '#fff' : '#ef4444', label: 'Bad', icon: '✗' },
                    ok:   { bg: isActive ? '#f59e0b' : (isDark ? '#1e293b' : '#fff'), border: '#f59e0b', text: isActive ? '#fff' : '#f59e0b', label: 'OK', icon: '~' },
                    good: { bg: isActive ? '#22c55e' : (isDark ? '#1e293b' : '#fff'), border: '#22c55e', text: isActive ? '#fff' : '#22c55e', label: 'Good', icon: '✓' },
                  };
                  const c = colors[rating];
                  return (
                    <button key={rating} onClick={() => handleRate(rating)}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: c.bg, color: c.text, border: `2px solid ${c.border}` }}>
                      {c.icon} {c.label}
                    </button>
                  );
                })}
              </div>

              {/* ─── Progress Summary ─── */}
              {cardRatings.size > 0 && (
                <div className="flex items-center gap-4 mt-5 text-xs font-medium" style={{ color: textSecondary }}>
                  <span style={{ color: '#22c55e' }}>✓ {ratingCounts.good}</span>
                  <span style={{ color: '#f59e0b' }}>~ {ratingCounts.ok}</span>
                  <span style={{ color: '#ef4444' }}>✗ {ratingCounts.bad}</span>
                  <span>· {cardRatings.size}/{flashcards.length} rated</span>
                </div>
              )}
            </div>
          )}

          {/* ═══ QUIZ TAB ═══ */}
          {activeTab === "quiz" && (
            <div className="w-full max-w-2xl">
              {/* Quiz mode selector */}
              {showQuizModeSelector && !quizComplete ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>Choose Quiz Mode</h2>
                  <p className="text-sm mb-8" style={{ color: textSecondary }}>How do you want to be tested?</p>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                    <button onClick={() => { setQuizMode("multiple-choice"); setShowQuizModeSelector(false); }}
                      className="flex-1 p-6 rounded-2xl text-left transition-all hover:scale-[1.03] active:scale-[0.98]"
                      style={{ background: isDark ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.06)', border: `2px solid ${accent}`, color: accent }}>
                      <div className="text-2xl mb-2">🔘</div>
                      <div className="font-bold text-base mb-1">Multiple Choice</div>
                      <div className="text-xs" style={{ color: textSecondary }}>Pick the correct answer from 4 options</div>
                    </button>
                    <button onClick={() => { setQuizMode("written"); setShowQuizModeSelector(false); }}
                      className="flex-1 p-6 rounded-2xl text-left transition-all hover:scale-[1.03] active:scale-[0.98]"
                      style={{ background: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.06)', border: `2px solid #a855f7`, color: '#a855f7' }}>
                      <div className="text-2xl mb-2">✍️</div>
                      <div className="font-bold text-base mb-1">Written</div>
                      <div className="text-xs" style={{ color: textSecondary }}>Type your answer (typos allowed!)</div>
                    </button>
                  </div>
                </div>
              ) : !quizComplete ? (
                <>
                  {/* Progress */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold" style={{ color: textSecondary }}>
                      Question {quizIndex + 1} of {flashcards.length}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                        Score: {quizScore}/{quizAnswered}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                        style={{ background: quizMode === 'written' ? 'rgba(168,85,247,0.15)' : 'rgba(6,182,212,0.15)', color: quizMode === 'written' ? '#a855f7' : accent }}>
                        {quizMode === 'written' ? 'Written' : 'MC'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full mb-6" style={{ background: isDark ? '#334155' : '#e2e8f0' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${((quizIndex + 1) / flashcards.length) * 100}%`,
                      background: accent
                    }} />
                  </div>

                  {/* Question */}
                  <div className="rounded-2xl p-6 mb-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <p className="text-lg font-semibold leading-relaxed" style={{ color: textPrimary }}
                      dangerouslySetInnerHTML={{
                        __html: flashcards[quizIndex].question
                          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>

                  {/* Multiple Choice Options */}
                  {quizMode === "multiple-choice" && (
                    <div className="space-y-3">
                      {quizOptions.map((option, i) => {
                        const isSelected = selectedAnswer === option;
                        const isCorrect = option === flashcards[quizIndex].answer;
                        const showResult = selectedAnswer !== null;

                        let optionBg = cardBg;
                        let optionBorder = cardBorder;
                        let optionText = textPrimary;

                        if (showResult && isCorrect) {
                          optionBg = isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)';
                          optionBorder = '#22c55e';
                          optionText = '#22c55e';
                        } else if (showResult && isSelected && !isCorrect) {
                          optionBg = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)';
                          optionBorder = '#ef4444';
                          optionText = '#ef4444';
                        }

                        return (
                          <button key={i} onClick={() => handleQuizAnswer(option)}
                            disabled={selectedAnswer !== null}
                            className="w-full text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.01] disabled:cursor-default"
                            style={{ background: optionBg, border: `2px solid ${optionBorder}`, color: optionText }}>
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ 
                                  background: showResult && isCorrect ? '#22c55e' : showResult && isSelected ? '#ef4444' : (isDark ? '#334155' : '#e2e8f0'),
                                  color: showResult && (isCorrect || isSelected) ? '#fff' : textSecondary 
                                }}>
                                {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + i)}
                              </span>
                              <span className="text-sm font-medium leading-relaxed">{option}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Written Answer */}
                  {quizMode === "written" && (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={writtenAnswer}
                          onChange={(e) => setWrittenAnswer(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleWrittenSubmit()}
                          placeholder="Type your answer..."
                          disabled={writtenSubmitted}
                          autoFocus
                          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                          style={{
                            background: isDark ? '#1e293b' : '#f1f5f9',
                            border: `2px solid ${writtenSubmitted ? (isAnswerCorrect ? '#22c55e' : '#ef4444') : cardBorder}`,
                            color: textPrimary,
                          }}
                        />
                        {!writtenSubmitted && (
                          <button onClick={handleWrittenSubmit}
                            disabled={!writtenAnswer.trim()}
                            className="px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-40"
                            style={{ background: accent }}>
                            Check
                          </button>
                        )}
                      </div>

                      {writtenSubmitted && (
                        <div className="mt-4 p-4 rounded-xl" style={{
                          background: isAnswerCorrect
                            ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.06)')
                            : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)'),
                          border: `1px solid ${isAnswerCorrect ? '#22c55e' : '#ef4444'}`,
                        }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{isAnswerCorrect ? '✓' : '✗'}</span>
                            <span className="text-sm font-bold" style={{ color: isAnswerCorrect ? '#22c55e' : '#ef4444' }}>
                              {isAnswerCorrect ? 'Correct!' : 'Not quite'}
                            </span>
                          </div>
                          {!isAnswerCorrect && (
                            <p className="text-sm mt-1" style={{ color: textSecondary }}>
                              Correct answer: <strong style={{ color: '#22c55e' }}>{flashcards[quizIndex].answer}</strong>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next button */}
                  {((selectedAnswer !== null && quizMode === "multiple-choice") || writtenSubmitted) && quizIndex < flashcards.length - 1 && (
                    <button onClick={handleQuizNext}
                      className="mt-6 w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] text-white"
                      style={{ background: accent }}>
                      Next Question →
                    </button>
                  )}
                </>
              ) : (
                /* Quiz Complete */
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{quizScore / flashcards.length >= 0.8 ? '🎉' : quizScore / flashcards.length >= 0.5 ? '👍' : '📚'}</div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>Quiz Complete!</h2>
                  <p className="text-lg mb-2" style={{ color: textSecondary }}>
                    You scored <strong style={{ color: '#22c55e' }}>{quizScore}</strong> out of <strong>{flashcards.length}</strong>
                    {' '}({Math.round((quizScore / flashcards.length) * 100)}%)
                  </p>
                  <p className="text-sm mb-6" style={{ color: textSecondary }}>
                    {quizScore / flashcards.length >= 0.8 ? 'Amazing work! Share your score and challenge your friends!' : quizScore / flashcards.length >= 0.5 ? 'Good effort! Keep studying to improve.' : 'Keep at it! Practice makes perfect.'}
                  </p>

                  {/* Share Score Card */}
                  <div 
                    className="mb-6 p-5 rounded-2xl mx-auto max-w-sm"
                    style={{
                      background: isDark 
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(34, 211, 238, 0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(34, 211, 238, 0.04) 100%)',
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                    }}
                  >
                    <button onClick={async () => {
                      const pct = Math.round((quizScore / flashcards.length) * 100);
                      const text = `I just scored ${pct}% on my study quiz!\n\nStudying smarter with StudyMaxx — AI-powered flashcards & quizzes from any notes.\n\nTry it free → https://www.studymaxx.net`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: `I scored ${pct}% on StudyMaxx!`, text, url: 'https://www.studymaxx.net' });
                        } else {
                          await navigator.clipboard.writeText(text);
                          setToast({ message: 'Score copied! Share it with your friends', type: 'success' });
                        }
                      } catch {}
                    }}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#ffffff', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                      Share Score & Challenge Friends
                    </button>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button onClick={handleQuizRestart}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 text-white"
                      style={{ background: accent }}>
                      Retake Quiz
                    </button>
                    <button onClick={() => setActiveTab("flashcards")}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                      style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                      Back to Flashcards
                    </button>
                  </div>
                </div>
              )}

              {/* Premium upsell after quiz */}
              {quizComplete && !isPremium && (
                <div 
                  className="mt-6 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => window.location.href = '/pricing'}
                  style={{
                    background: isDark 
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(6, 182, 212, 0.06) 0%, rgba(59, 130, 246, 0.04) 100%)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⭐</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        Want deeper study sessions?
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        Premium unlocks up to 75 cards, custom difficulty, and unlimited sets
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ MATCH TAB (no hint tags) ═══ */}
          {activeTab === "match" && (
            <div className="w-full max-w-3xl">
              {matchCards.length === 0 ? (
                /* Match setup screen */
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎮</div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>Match Game</h2>
                  <p className="text-sm mb-8" style={{ color: textSecondary }}>
                    Match terms with their definitions as fast as you can!
                  </p>

                  {/* Card count slider */}
                  <div className="max-w-md mx-auto mb-8 p-6 rounded-2xl" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.95)', border: `1px solid ${cardBorder}` }}>
                    <label className="block text-sm font-semibold mb-4" style={{ color: textPrimary }}>
                      Number of pairs: {matchCardCount}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max={Math.min(20, flashcards.length)}
                      value={matchCardCount}
                      onChange={(e) => setMatchCardCount(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: isDark 
                          ? `linear-gradient(to right, ${accent} 0%, ${accent} ${(matchCardCount - 3) / (Math.min(20, flashcards.length) - 3) * 100}%, rgba(100,116,139,0.3) ${(matchCardCount - 3) / (Math.min(20, flashcards.length) - 3) * 100}%, rgba(100,116,139,0.3) 100%)`
                          : `linear-gradient(to right, ${accent} 0%, ${accent} ${(matchCardCount - 3) / (Math.min(20, flashcards.length) - 3) * 100}%, rgba(203,213,225,0.5) ${(matchCardCount - 3) / (Math.min(20, flashcards.length) - 3) * 100}%, rgba(203,213,225,0.5) 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs mt-2" style={{ color: textSecondary }}>
                      <span>3</span>
                      <span>{Math.min(20, flashcards.length)}</span>
                    </div>
                    <p className="text-xs mt-3" style={{ color: textSecondary }}>
                      {matchCardCount * 2} cards total ({matchCardCount} terms + {matchCardCount} definitions)
                    </p>
                  </div>

                  <button
                    onClick={initMatch}
                    className="px-8 py-4 rounded-xl text-base font-bold transition-all hover:scale-105 text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accent}, #10b981)` }}
                  >
                    Start Match Game
                  </button>
                </div>
              ) : !matchComplete ? (
                <>
                  {/* Stats */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold" style={{ color: textSecondary }}>
                      {matchedPairs.size} / {matchCards.length / 2} matched
                    </span>
                    <div className="flex items-center gap-4 text-sm font-medium" style={{ color: textSecondary }}>
                      <span>⏱ {formatTime(matchTimer)}</span>
                      <span>Tries: {matchAttempts}</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full mb-6" style={{ background: isDark ? '#334155' : '#e2e8f0' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${(matchedPairs.size / (matchCards.length / 2)) * 100}%`,
                      background: '#22c55e'
                    }} />
                  </div>

                  {/* Match Grid — NO type labels */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {matchCards.map(card => {
                      const isMatched = matchedPairs.has(card.pairId);
                      const isSelected = matchSelected === card.id;
                      const isWrong = matchWrong === card.id;

                      let cardBgLocal = cardBg;
                      let border = cardBorder;

                      if (isMatched) {
                        cardBgLocal = isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)';
                        border = '#22c55e';
                      } else if (isWrong) {
                        cardBgLocal = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)';
                        border = '#ef4444';
                      } else if (isSelected) {
                        cardBgLocal = isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.08)';
                        border = accent;
                      }

                      return (
                        <button key={card.id} onClick={() => !isMatched && handleMatchSelect(card.id)}
                          disabled={isMatched}
                          className={`p-4 rounded-xl text-left transition-all duration-200 ${isMatched ? 'opacity-40' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                          style={{ background: cardBgLocal, border: `2px solid ${border}`, minHeight: '80px' }}>
                          <span className="text-xs font-medium leading-snug block" style={{ color: isMatched ? textSecondary : textPrimary }}>
                            {card.text.length > 80 ? card.text.substring(0, 80) + '…' : card.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">�</div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>All Matched!</h2>
                  <p className="text-lg mb-2" style={{ color: textSecondary }}>
                    Time: <strong>{formatTime(matchTimer)}</strong> · Tries: <strong>{matchAttempts}</strong>
                  </p>
                  <p className="text-sm mb-2" style={{ color: textSecondary }}>
                    Accuracy: {matchAttempts > 0 ? Math.round((matchedPairs.size / matchAttempts) * 100) : 100}%
                  </p>
                  <p className="text-xs mb-6" style={{ color: textSecondary }}>
                    Can your friends beat your time? Share and find out!
                  </p>

                  {/* Share CTA */}
                  <div 
                    className="mb-6 p-4 rounded-2xl mx-auto max-w-sm"
                    style={{
                      background: isDark 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}
                  >
                    <button onClick={async () => {
                      const acc = matchAttempts > 0 ? Math.round((matchedPairs.size / matchAttempts) * 100) : 100;
                      const text = `I matched all ${matchedPairs.size} pairs in ${formatTime(matchTimer)} with ${acc}% accuracy!\n\nThink you can beat me? Try StudyMaxx free → https://www.studymaxx.net`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: `Beat my match time on StudyMaxx!`, text, url: 'https://www.studymaxx.net' });
                        } else {
                          await navigator.clipboard.writeText(text);
                          setToast({ message: 'Score copied! Challenge your friends', type: 'success' });
                        }
                      } catch {}
                    }}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', color: '#ffffff', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                      Challenge Friends
                    </button>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button onClick={() => {
                      setMatchCards([]);
                      setMatchedPairs(new Set());
                      setMatchSelected(null);
                      setMatchWrong(null);
                      setMatchAttempts(0);
                      setMatchTimer(0);
                      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
                    }}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                      style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                      Back to Setup
                    </button>
                    <button onClick={initMatch}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 text-white"
                      style={{ background: '#22c55e' }}>
                      Play Again
                    </button>
                    <button onClick={() => setActiveTab("flashcards")}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                      style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                      Back to Flashcards
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ─── Side Panel (collapsible) ─── */}
        <aside 
          className={`${sidebarCollapsed ? 'lg:w-12' : 'lg:w-64'} border-t lg:border-t-0 lg:border-l flex lg:flex-col gap-2 transition-all duration-300`}
          style={{ borderColor: cardBorder, background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.95)' }}>
          
          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:flex items-center justify-between px-3 pt-3">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] px-1" style={{ color: textSecondary }}>
                Study Modes
              </p>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-1.5 rounded-lg transition-all hover:scale-110"
              style={{ 
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: textSecondary,
              }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {sidebarCollapsed 
                  ? <polyline points="9 18 15 12 9 6" />
                  : <polyline points="15 18 9 12 15 6" />
                }
              </svg>
            </button>
          </div>

          <div className={`${sidebarCollapsed ? 'lg:px-1.5' : 'lg:px-4'} px-3 pb-3 lg:pb-4 flex lg:flex-col gap-2`}>
            {([
              { id: 'flashcards' as ActiveTab, icon: <FlashcardIcon />, label: 'Flashcards', desc: 'Review cards' },
              { id: 'quiz' as ActiveTab, icon: <QuizIcon />, label: 'Quiz', desc: 'Test yourself' },
              { id: 'match' as ActiveTab, icon: <MatchIcon />, label: 'Match', desc: 'Memory game' },
            ]).map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'quiz') setShowQuizModeSelector(true); }}
                className={`flex-1 lg:flex-initial flex items-center ${sidebarCollapsed ? 'lg:justify-center' : ''} gap-3 ${sidebarCollapsed ? 'lg:px-0 lg:py-2.5' : 'px-4 py-3'} rounded-xl text-left transition-all duration-200 hover:scale-[1.02]`}
                style={{
                  background: activeTab === tab.id
                    ? (isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.08)')
                    : 'transparent',
                  border: activeTab === tab.id ? `1px solid ${accent}` : '1px solid transparent',
                  color: activeTab === tab.id ? accent : textSecondary,
                }}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                {tab.icon}
                {!sidebarCollapsed && (
                  <div className="hidden lg:block">
                    <p className="text-sm font-semibold">{tab.label}</p>
                    <p className="text-[10px]" style={{ color: textSecondary }}>{tab.desc}</p>
                  </div>
                )}
                <span className="lg:hidden text-xs font-semibold">{tab.label}</span>
              </button>
            ))}

            <div className="hidden lg:block my-2" style={{ borderTop: `1px solid ${cardBorder}` }} />

            {/* StudyMaxx AI */}
            <button
              className={`flex-1 lg:flex-initial flex items-center ${sidebarCollapsed ? 'lg:justify-center' : ''} gap-3 ${sidebarCollapsed ? 'lg:px-0 lg:py-2.5' : 'px-4 py-3'} rounded-xl text-left transition-all hover:scale-[1.02]`}
              style={{
                background: showChat
                  ? (isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.1)')
                  : (isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.05)'),
                border: showChat ? '1px solid #a855f7' : '1px solid rgba(168,85,247,0.3)',
                color: '#a855f7',
              }}
              onClick={() => {
                setShowChat(s => !s);
                setTimeout(() => chatInputRef.current?.focus(), 100);
              }}
              title={sidebarCollapsed ? 'StudyMaxx AI' : undefined}
            >
              <SparkleIcon />
              {!sidebarCollapsed && (
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold">StudyMaxx AI</p>
                  <p className="text-[10px]" style={{ color: textSecondary }}>Ask about this set</p>
                </div>
              )}
              <span className="lg:hidden text-xs font-semibold">AI</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ─── AI Chat Panel (slide-over) ─── */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowChat(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />
          
          <div 
            className="relative w-full max-w-md h-full flex flex-col"
            style={{ background: isDark ? '#0f172a' : '#ffffff', borderLeft: `1px solid ${cardBorder}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
                  <SparkleIcon />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: textPrimary }}>StudyMaxx AI</p>
                  <p className="text-[10px]" style={{ color: textSecondary }}>Your study coach · {flashcards.length} cards loaded</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: textSecondary }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1e293b' : '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                    <SparkleIcon />
                  </div>
                  <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                    Ask me anything about your study set!
                  </p>
                  <p className="text-xs mb-4" style={{ color: textSecondary }}>
                    I can explain concepts, quiz you, or help you study
                  </p>
                  <div className="flex flex-col gap-2">
                    {["Explain the hardest topic", "Quiz me on a random card", "Give me a summary"].map(suggestion => (
                      <button key={suggestion}
                        onClick={() => { setChatInput(suggestion); }}
                        className="text-xs px-3 py-2 rounded-lg transition-all hover:scale-[1.02]"
                        style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary, border: `1px solid ${cardBorder}` }}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                    style={{
                      background: msg.role === 'user' ? accent : (isDark ? '#1e293b' : '#f1f5f9'),
                      color: msg.role === 'user' ? '#fff' : textPrimary,
                    }}>
                    {msg.text || (isChatLoading && i === chatMessages.length - 1 ? '...' : '')}
                  </div>
                </div>
              ))}

              {isChatLoading && chatMessages[chatMessages.length - 1]?.role !== 'ai' && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                    </svg>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm"
                    style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: textSecondary }}>
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="px-5 py-4" style={{ borderTop: `1px solid ${cardBorder}` }}>
              <div className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  placeholder="Ask about your study set..."
                  disabled={isChatLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    border: `1px solid ${cardBorder}`,
                    color: textPrimary,
                  }}
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2.5 rounded-xl text-white transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: '#a855f7' }}>
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Save Dialog ─── */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: textPrimary }}>Save Study Set</h3>
            <input type="text" value={setName} onChange={e => setSetName(e.target.value)}
              placeholder="Give your set a name..." autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
              style={{ background: isDark ? '#0f172a' : '#f1f5f9', border: `1px solid ${cardBorder}`, color: textPrimary }}
              onKeyDown={e => e.key === 'Enter' && handleSaveSet()}
            />
            <div className="flex gap-3">
              <button onClick={handleSaveSet}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: accent }}>
                Save
              </button>
              <button onClick={() => { setShowSaveDialog(false); setSetName(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: isDark ? '#334155' : '#e2e8f0', color: textSecondary }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
