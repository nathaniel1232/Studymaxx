"use client";

import { useState, useEffect } from "react";
import FlashcardCard from "./FlashcardCard";
import StudyFactBadge from "./StudyFactBadge";
import { saveFlashcardSet, shareFlashcardSet, shuffleArray, Flashcard, getSavedFlashcardSets } from "../utils/storage";
import { getStudyFact } from "../utils/studyFacts";
import { useTranslation, useSettings } from "../contexts/SettingsContext";
import LoginModal from "./LoginModal";
import ArrowIcon from "./icons/ArrowIcon";
import Toast, { ToastType } from "./Toast";
import { getCurrentUser } from "../utils/supabase";
import { messages } from "../utils/messages";

type StudyMode = "review" | "test";
type TestType = "multiple-choice" | "written" | null;
type TestMode = "lives" | "practice" | null; // lives = 3 lives, practice = no lives just track score

interface StudyViewProps {
  flashcards: Flashcard[];
  currentSetId: string | null;
  onBack: () => void;
  isPremium?: boolean;
}

interface ToastMessage {
  message: string;
  type: ToastType;
}

export default function StudyView({ flashcards: initialFlashcards, currentSetId, onBack, isPremium = false }: StudyViewProps) {
  const t = useTranslation();
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [originalFlashcards] = useState<Flashcard[]>(initialFlashcards); // Keep original set for saving
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [studyMode, setStudyMode] = useState<StudyMode>("review");
  const [testResults, setTestResults] = useState<Map<string, boolean>>(new Map());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [setName, setSetName] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Feature flags - set to false to hide unfinished features
  const ENABLE_LOGIN_MODAL = true; // Login/auth enabled
  const ENABLE_SHARE = true; // Share feature enabled
  
  // Self-rating state (for review mode)
  const [cardRatings, setCardRatings] = useState<Map<string, 'bad' | 'ok' | 'good'>>(new Map());
  
  // Quiz state
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showTestTypeDialog, setShowTestTypeDialog] = useState(false);
  const [testType, setTestType] = useState<TestType>(null);
  const [testMode, setTestMode] = useState<TestMode>(null); // lives or practice
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [writtenSubmitted, setWrittenSubmitted] = useState(false);
  
  // Gamification state (Quiz Mode only)
  const [lives, setLives] = useState(3);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isQuizEnded, setIsQuizEnded] = useState(false);
  
  // Explanation state (for wrong answers)
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  
  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };
  
  // Check if user is logged in and show login modal if needed
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const user = await getCurrentUser();
        setIsLoggedIn(!!user);
        
        // Show login modal if:
        // 1. User is not logged in
        // 2. This is a new set (not currentSetId)
        // 3. User has 0 or 1 saved sets (first time)
        if (!user && !currentSetId && ENABLE_LOGIN_MODAL) {
          const savedSets = await getSavedFlashcardSets();
          if (savedSets.length <= 1) {
            // Delay modal by 2 seconds to let them see the flashcards first
            setTimeout(() => {
              setShowLoginModal(true);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };
    
    checkLoginStatus();
  }, [currentSetId]);

  const currentCard = flashcards[currentIndex];
  const progressPercentage = Math.round(
    ((currentIndex + 1) / flashcards.length) * 100
  );
  const masteredPercentage = Math.round(
    (masteredCards.size / flashcards.length) * 100
  );

  // Note: Removed automatic math detection as it was showing pen/paper icon
  // for non-math questions (e.g., "Calculate the distance" in a book plot)
  // Only Math Mode (explicitly enabled by user) should show math-related UI

  // Levenshtein distance for fuzzy matching (typo tolerance)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  };

  // Check if written answer is correct (with typo tolerance)
  const checkWrittenAnswer = (userAnswer: string, correctAnswer: string): boolean => {
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    // Exact match
    if (normalizedUser === normalizedCorrect) return true;
    
    // Calculate allowed typos based on answer length
    const maxLength = Math.max(normalizedUser.length, normalizedCorrect.length);
    let allowedTypos = 0;
    if (maxLength <= 4) allowedTypos = 1;
    else if (maxLength <= 8) allowedTypos = 2;
    else if (maxLength <= 15) allowedTypos = 3;
    else allowedTypos = Math.floor(maxLength * 0.2); // 20% of length for longer answers
    
    const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
    return distance <= allowedTypos;
  };

  // Find semantically similar answers from the flashcard set
  const findSimilarAnswers = (correctAnswer: string, allCards: Flashcard[]): string[] => {
    const lowerAnswer = correctAnswer.toLowerCase();
    const answerWords = lowerAnswer.split(/\s+/);
    
    // Score each other answer by similarity
    const scoredAnswers = allCards
      .filter(card => card.id !== currentCard.id && card.answer !== correctAnswer)
      .map(card => {
        const otherAnswer = card.answer.toLowerCase();
        const otherWords = otherAnswer.split(/\s+/);
        let score = 0;
        
        // Same length (similar format)
        if (Math.abs(correctAnswer.length - card.answer.length) < 5) {
          score += 5;
        } else if (Math.abs(correctAnswer.length - card.answer.length) < 15) {
          score += 2;
        }
        
        // Same word count
        const wordDiff = Math.abs(answerWords.length - otherWords.length);
        if (wordDiff === 0) {
          score += 5;
        } else if (wordDiff <= 2) {
          score += 2;
        }
        
        // Shared words
        const sharedWords = answerWords.filter(w => otherWords.includes(w)).length;
        score += sharedWords * 5;
        
        // Same starting character
        if (lowerAnswer[0] === otherAnswer[0]) {
          score += 1;
        }
        
        // Same answer type detection
        const types = {
          number: /^\d+$/.test(correctAnswer) && /^\d+$/.test(card.answer),
          year: /^\d{4}$/.test(correctAnswer) && /^\d{4}$/.test(card.answer),
          person: /^[A-Z][a-z]+ [A-Z]/.test(correctAnswer) && /^[A-Z][a-z]+ [A-Z]/.test(card.answer),
          place: /(city|country|mountain|river|ocean|sea|island)/i.test(currentCard.question) &&
                 (card.question.toLowerCase().includes('where') || /^[A-Z]/.test(card.answer)),
          concept: correctAnswer.length > 5 && card.answer.length > 5 && 
                   !correctAnswer.includes(' ') && !card.answer.includes(' '),
          shortAnswer: answerWords.length <= 3 && otherWords.length <= 3,
        };
        
        // Boost score if same type
        if (types.number || types.year) score += 10;
        if (types.person) score += 8;
        if (types.place) score += 8;
        if (types.concept) score += 5;
        if (types.shortAnswer) score += 3;
        
        // Penalize very different lengths
        const lengthDiff = Math.abs(correctAnswer.length - card.answer.length);
        if (lengthDiff > 15) score -= 10; // Stricter penalty

        // CRITICAL: The "Jonathan Rule" - Prevent obvious length guessing
        // If correct answer is substantial (>30 chars), reject answers that are significantly shorter
        if (correctAnswer.length > 30 && card.answer.length < correctAnswer.length * 0.7) {
           score -= 50; 
        }
        
        return { answer: card.answer, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    return scoredAnswers.map(item => item.answer);
  };

  // Detect if a question is grammar-related
  const detectGrammarQuestion = (question: string, answer: string): boolean => {
    const lowerQuestion = question.toLowerCase();
    const grammarIndicators = [
      'tense', 'tempus', 'verb', 'correct', 'fill in', 'choose',
      'identify', 'grammar', 'sentence', 'word order', 'put in order',
      'fix', 'rewrite', 'conjugate', 'passive', 'active'
    ];
    
    return grammarIndicators.some(indicator => lowerQuestion.includes(indicator));
  };

  // Generate intelligent distractors for grammar questions
  const generateGrammarDistractors = (question: string, correctAnswer: string): string[] => {
    const lowerQuestion = question.toLowerCase();
    const lowerAnswer = correctAnswer.toLowerCase();
    
    // Tense identification questions
    if (lowerQuestion.includes('tense') || lowerQuestion.includes('tempus')) {
      const tenses = [
        'Present simple', 'Present continuous', 'Present perfect', 'Present perfect continuous',
        'Past simple', 'Past continuous', 'Past perfect', 'Past perfect continuous',
        'Future simple', 'Future continuous', 'Future perfect',
        'Presens', 'Preteritum', 'Perfektum', 'Pluskvamperfektum',
        'Simple present', 'Simple past', 'Simple future'
      ];
      
      // Find similar tenses (exclude the correct answer)
      const distractors = tenses
        .filter(t => t.toLowerCase() !== lowerAnswer)
        .filter(t => {
          // Prefer tenses from the same category
          const answerParts = lowerAnswer.split(' ');
          const tParts = t.toLowerCase().split(' ');
          return answerParts.some(part => tParts.includes(part)) || Math.random() > 0.5;
        })
        .slice(0, 3);
      
      return distractors.length >= 2 ? distractors : [];
    }
    
    // Fill in the blank with verb forms
    if (lowerQuestion.includes('fill') || lowerQuestion.includes('___') || lowerQuestion.includes('blank')) {
      // Try to generate common mistake variations
      const distractors: string[] = [];
      
      // For simple past tense mistakes
      if (/ed$/.test(correctAnswer)) {
        const base = correctAnswer.replace(/ed$/, '');
        distractors.push(base); // base form
        distractors.push(base + 'ing'); // -ing form
      }
      // For irregular verbs, suggest common mistakes
      else if (correctAnswer.length <= 10) {
        distractors.push(correctAnswer + 'ed'); // overgeneralization
        distractors.push(correctAnswer.replace(/e$/, '') + 'ing');
      }
      
      // Add base form variations
      const baseVariations = [
        correctAnswer.replace(/s$/, ''), // remove -s
        correctAnswer + 's', // add -s
        correctAnswer.replace(/ing$/, ''), // remove -ing
      ].filter(v => v !== correctAnswer && v.length > 2);
      
      distractors.push(...baseVariations);
      
      return distractors.slice(0, 3);
    }
    
    // Word order questions
    if (lowerQuestion.includes('order') || lowerQuestion.includes('rekkefølge')) {
      // Generate variations by swapping words
      const words = correctAnswer.split(' ');
      if (words.length >= 2) {
        const distractors: string[] = [];
        
        // Swap first two words
        if (words.length >= 2) {
          const variation1 = [words[1], words[0], ...words.slice(2)].join(' ');
          if (variation1 !== correctAnswer) distractors.push(variation1);
        }
        
        // Swap last two words
        if (words.length >= 2) {
          const variation2 = [...words.slice(0, -2), words[words.length - 1], words[words.length - 2]].join(' ');
          if (variation2 !== correctAnswer) distractors.push(variation2);
        }
        
        // Random shuffle
        if (words.length >= 3) {
          const shuffled = [...words].sort(() => Math.random() - 0.5).join(' ');
          if (shuffled !== correctAnswer) distractors.push(shuffled);
        }
        
        return distractors.slice(0, 3);
      }
    }
    
    // Sentence correction
    if (lowerQuestion.includes('correct') && correctAnswer.split(' ').length > 3) {
      // Try to generate plausible but wrong variations
      const distractors: string[] = [];
      const words = correctAnswer.split(' ');
      
      // Change verb form
      distractors.push(correctAnswer.replace(/\b(is|are|am)\b/i, words => words === 'is' ? 'are' : 'is'));
      distractors.push(correctAnswer.replace(/\b(was|were)\b/i, words => words === 'was' ? 'were' : 'was'));
      distractors.push(correctAnswer.replace(/\b(don't|doesn't)\b/i, words => words === "don't" ? "doesn't" : "don't"));
      
      return distractors.filter(d => d !== correctAnswer && d !== correctAnswer).slice(0, 3);
    }
    
    return [];
  };

  // Generate multiple-choice options for the current question in test mode
  const generateQuizOptions = (correctAnswer: string, allCards: Flashcard[]): string[] => {
    // If the current card has pre-generated distractors, use them
    if (currentCard.distractors && currentCard.distractors.length > 0) {
      const allOptions = [correctAnswer, ...currentCard.distractors];
      return shuffleArray(allOptions);
    }
    
    // Detect if this is a grammar question (language subject context)
    const isGrammarQuestion = detectGrammarQuestion(currentCard.question, correctAnswer);
    
    if (isGrammarQuestion) {
      // Generate intelligent grammar-based distractors
      const grammarDistractors = generateGrammarDistractors(currentCard.question, correctAnswer);
      if (grammarDistractors.length >= 2) {
        const allOptions = [correctAnswer, ...grammarDistractors];
        return shuffleArray(allOptions);
      }
    }
    
    // SMART FALLBACK: Select semantically similar answers
    const similarAnswers = findSimilarAnswers(correctAnswer, allCards);
    
    if (similarAnswers.length >= 2) {
      const selectedDistractors = similarAnswers.slice(0, 3);
      const allOptions = [correctAnswer, ...selectedDistractors];
      return shuffleArray(allOptions);
    }
    
    // Last resort: random selection (but this should rarely happen)
    const incorrectAnswers = allCards
      .filter((card) => card.id !== currentCard.id && card.answer !== correctAnswer)
      .map((card) => card.answer);
    
    const numIncorrect = Math.min(incorrectAnswers.length, 3);
    const shuffledIncorrect = shuffleArray(incorrectAnswers);
    const selectedIncorrect = shuffledIncorrect.slice(0, numIncorrect);
    
    const allOptions = [correctAnswer, ...selectedIncorrect];
    return shuffleArray(allOptions);
  };

  // Generate quiz options when current question changes in test mode
  useEffect(() => {
    if (studyMode === "test" && currentCard && !testResults.has(currentCard.id)) {
      // For multiple choice mode, always generate options
      if (testType === 'multiple-choice') {
        setQuizOptions(generateQuizOptions(currentCard.answer, flashcards));
      } else if (testType === 'written') {
        setQuizOptions([]); // Written mode doesn't need options
      } else {
        // Fallback to old behavior (distractors-based)
        if (currentCard.distractors && currentCard.distractors.length > 0) {
          setQuizOptions(generateQuizOptions(currentCard.answer, flashcards));
        } else {
          setQuizOptions([]); // Empty means use self-assessment
        }
      }
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    }
  }, [currentIndex, studyMode, currentCard, flashcards, testResults, testType]);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Reset written mode state
      setWrittenAnswer("");
      setWrittenSubmitted(false);
      // Reset explanation
      setExplanation(null);
      setIsLoadingExplanation(false);
    }
  };

  // Generate explanation for wrong answers
  const generateExplanation = async (question: string, correctAnswer: string, userAnswer: string) => {
    setIsLoadingExplanation(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, correctAnswer, userAnswer }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExplanation(data.explanation);
      }
    } catch (error) {
      console.error('Failed to generate explanation:', error);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMastered = () => {
    setMasteredCards(new Set([...masteredCards, currentCard.id]));
    handleNext();
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setMasteredCards(new Set());
    setTestResults(new Map());
  };

  const handleShuffle = () => {
    const shuffled = shuffleArray(flashcards);
    setFlashcards(shuffled);
    setCurrentIndex(0);
  };

  const handleSaveSet = async () => {
    if (!setName.trim()) {
      showToast(messages.modals.saving.title, "warning");
      return;
    }
    
    try {
      console.log('[StudyView] Saving flashcard set:', { name: setName, cardCount: originalFlashcards.length });
      // Always save the ORIGINAL set, not the filtered one (e.g., if reviewing mistakes)
      await saveFlashcardSet(setName, originalFlashcards);
      console.log('[StudyView] ✅ Save successful');
      setShowSaveDialog(false);
      setSetName("");
      showToast(messages.success.setCreated, "success");
      
      // Only show login modal if user is NOT logged in
      if (ENABLE_LOGIN_MODAL && !isLoggedIn) {
        setShowLoginModal(true);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error) || '';
      console.error('[StudyView] ❌ Error saving flashcard set:', errorMsg, error);
      showToast(messages.errors.saveFailedGeneric, "error");
    }
  };

  const handleShare = async () => {
    // Share feature disabled for initial launch
    if (!ENABLE_SHARE) {
      return;
    }
    
    if (!currentSetId) {
      showToast(messages.errors.saveFailedAuth, "warning");
      return;
    }

    try {
      const result = await shareFlashcardSet(currentSetId);
      if (result) {
        setShareUrl(result.shareUrl);
        setShowShareDialog(true);
      } else {
        showToast(messages.errors.systemError, "error");
      }
    } catch (error) {
      console.error('Share error:', error);
      showToast(messages.errors.systemError, "error");
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    showToast(messages.success.dataSynced, "success");
  };

  const handleTestAnswer = (correct: boolean) => {
    const newResults = new Map(testResults);
    newResults.set(currentCard.id, correct);
    setTestResults(newResults);
    handleNext();
  };

  const handleQuizAnswer = (selectedOption: string) => {
    if (selectedAnswer !== null) return; // Already answered
    
    // Handle self-assessment answers (for math problems)
    let correct: boolean;
    if (selectedOption === 'correct') {
      correct = true;
    } else if (selectedOption === 'wrong') {
      correct = false;
    } else if (selectedOption === 'ok') {
      correct = true; // Treat 'ok' as correct but could track separately if needed
    } else {
      // Regular multiple choice
      correct = selectedOption === currentCard.answer;
    }
    
    setSelectedAnswer(selectedOption);
    setIsAnswerCorrect(correct);
    
    // Update test results
    const newResults = new Map(testResults);
    newResults.set(currentCard.id, correct);
    setTestResults(newResults);
    
    // Update streak and lives
    if (correct) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));
    } else {
      setCurrentStreak(0);
      // Generate explanation for wrong answer
      generateExplanation(currentCard.question, currentCard.answer, selectedOption);
      // Only deduct lives in lives mode
      if (testMode === 'lives') {
        const newLives = lives - 1;
        setLives(newLives);
        
        // End quiz if no lives left (only in lives mode)
        if (newLives <= 0) {
          setIsQuizEnded(true);
          return; // Don't auto-advance
        }
      }
    }
    
    // Auto-advance to next question removed to allow user to see feedback
    // setTimeout(() => {
    //   if (currentIndex < flashcards.length - 1) {
    //     setCurrentIndex(currentIndex + 1);
    //   }
    // }, 1500);
  };

  const handleRateCard = (cardId: string, rating: 'bad' | 'ok' | 'good') => {
    console.log('⭐ handleRateCard called:', { cardId, rating, currentIndex });
    
    // Update ratings - NO auto-advance, user clicks Next button
    setCardRatings(prev => {
      const newRatings = new Map(prev);
      newRatings.set(cardId, rating);
      console.log('📊 Updated ratings:', Array.from(newRatings.entries()));
      return newRatings;
    });
  };

  const handleRetakeFailedCards = () => {
    const failedCards = flashcards.filter((card) => testResults.get(card.id) === false);
    setFlashcards(failedCards);
    setCurrentIndex(0);
    setTestResults(new Map());
    setStudyMode("review");
    
    // Important: DO NOT save the set when reviewing mistakes
    // Only review the failed cards, don't overwrite the original set
  };

  const isTestComplete = studyMode === "test" && testResults.size === flashcards.length;
  const correctCount = Array.from(testResults.values()).filter((v) => v).length;
  const incorrectCount = testResults.size - correctCount;

  const isAllMastered = masteredCards.size === flashcards.length;

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8" style={{ background: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={onBack}
            className="px-4 py-2 font-medium rounded-lg flex items-center gap-2 bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </button>
          <h1 className="text-page-title text-gray-900 dark:text-white">
            {studyMode === "test" ? t("quiz") : t("study")}
          </h1>
          <div className="w-20" />
        </div>

        {/* Mode Switcher & Actions - NEW COLOR SCHEME */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setStudyMode("review")}
            className={`px-10 py-5 font-black text-lg rounded-md transition-all duration-200 ease-out hover:-translate-y-1 active:translate-y-0 shadow-xl hover:shadow-2xl ${
              studyMode === "review"
                ? "bg-cyan-600 text-white shadow-teal-500/50 ring-4 ring-teal-300/40"
                : "bg-cyan-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-cyan-100 dark:hover:bg-teal-900/30 shadow-teal-200/50 hover:shadow-teal-300/60"
            }`}
          >
            📚 {t("study")}
          </button>
          <button
            onClick={() => {
              setShowTestTypeDialog(true);
            }}
            className={`px-10 py-5 font-black text-lg rounded-md transition-all duration-200 ease-out hover:-translate-y-1 active:translate-y-0 shadow-xl hover:shadow-2xl ${
              studyMode === "test"
                ? "bg-blue-600 text-white shadow-indigo-500/50 ring-4 ring-indigo-300/40"
                : "bg-blue-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-blue-100 dark:hover:bg-indigo-900/30 shadow-indigo-200/50 hover:shadow-indigo-300/60"
            }`}
          >
            <span>{t("test_yourself")}</span>
          </button>
          <button
            onClick={handleShuffle}
            disabled={studyMode === "test"}
            className="px-10 py-5 bg-amber-500 hover:opacity-90 text-white font-black text-lg rounded-md transition-all duration-200 ease-out shadow-xl hover:shadow-2xl hover:shadow-amber-400/50 hover:-translate-y-1 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
          >
            🔀 {t("shuffle")}
          </button>
          {/* Share button - DISABLED for production launch */}
          {ENABLE_SHARE && currentSetId && (
            <button
              onClick={handleShare}
              className="px-8 py-6 bg-cyan-600 hover:opacity-90 text-white font-black text-xl rounded-md transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
            >
              🔗 {t("share")}
            </button>
          )}
          {!currentSetId && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-10 py-5 bg-blue-600 hover:opacity-90 text-white font-black text-lg rounded-md transition-all duration-200 ease-out shadow-xl hover:shadow-2xl hover:shadow-blue-400/50 hover:-translate-y-1 active:translate-y-0"
            >
              💾 {t("save")}
            </button>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="card-elevated p-12 mb-8" style={{ borderRadius: '1rem' }}>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              {t("save_this_set")}
            </h3>
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder={t("name_your_set")}
              className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white mb-6 text-base"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveSet}
                className="flex-1 px-6 py-3 bg-cyan-600 hover:opacity-90 text-white font-semibold rounded-md transition-all shadow-lg"
              >
                {t("save")}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSetName("");
                }}
                className="flex-1 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-md transition-all border border-gray-200 dark:border-gray-700"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Share Dialog - DISABLED for production launch */}
        {ENABLE_SHARE && showShareDialog && (
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-md shadow-2xl p-10 mb-8 border-2 border-cyan-200 dark:border-cyan-800">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
                {t("share_study_set")}
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {t("anyone_can_view")}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-md p-6 mb-8 border-2 border-cyan-300 dark:border-cyan-700">
              <p className="text-base text-gray-700 dark:text-gray-300 break-all font-mono font-bold text-center">
                {shareUrl}
              </p>
            </div>

            {/* Study fact in share dialog */}
            <div className="mb-8">
              <StudyFactBadge context="general" position="inline" />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCopyShareLink}
                className="flex-1 px-6 py-4 bg-cyan-600 hover:opacity-90 text-white font-black text-lg rounded-md transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
              >
                📋 {t("copy_link")}
              </button>
              <button
                onClick={() => setShowShareDialog(false)}
                className="flex-1 px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-lg rounded-md transition-all border-2 border-gray-300 dark:border-gray-600"
              >
                ✕ {t("close")}
              </button>
            </div>

            <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400 font-semibold">
              {t("tip_sign_in")}
            </p>
          </div>
        )}

        {/* Test Type Selection Dialog - Cookie consent style */}
        {showTestTypeDialog && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div 
              className="relative rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
              style={{
                backgroundColor: settings.theme === 'dark' ? '#1e293b' : '#ffffff',
                border: settings.theme === 'dark' ? '2px solid #334155' : '2px solid #e2e8f0',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
              }}
            >
              {testType === null ? (
                <>
                  {/* Header */}
                  <div 
                    className="p-5"
                    style={{ borderBottom: settings.theme === 'dark' ? '2px solid #334155' : '2px solid #e2e8f0' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: settings.theme === 'dark' ? '#312e81' : '#eef2ff' }}
                      >
                        <svg className="w-6 h-6" style={{ color: settings.theme === 'dark' ? '#a5b4fc' : '#6366f1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h3 
                          className="text-lg font-bold"
                          style={{ color: settings.theme === 'dark' ? '#f1f5f9' : '#1e293b' }}
                        >
                          Choose Test Type
                        </h3>
                        <p 
                          className="text-xs"
                          style={{ color: settings.theme === 'dark' ? '#94a3b8' : '#64748b' }}
                        >
                          How do you want to answer?
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="p-5 space-y-3">
                    <button
                      onClick={() => setTestType('written')}
                      className="w-full p-4 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor: settings.theme === 'dark' ? '#1e40af' : '#3b82f6',
                        border: '2px solid #2563eb',
                        color: '#ffffff'
                      }}
                    >
                      <div className="text-left">
                        <p className="font-bold text-base mb-1">Written Answer</p>
                        <p className="text-sm opacity-90">Type in your answer</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setTestType('multiple-choice')}
                      className="w-full p-4 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor: settings.theme === 'dark' ? '#0369a1' : '#0ea5e9',
                        border: '2px solid #0284c7',
                        color: '#ffffff'
                      }}
                    >
                      <div className="text-left">
                        <p className="font-bold text-base mb-1">Multiple Choice</p>
                        <p className="text-sm opacity-90">Pick from answer options</p>
                      </div>
                    </button>
                  </div>
                  
                  {/* Cancel button */}
                  <div 
                    className="p-5"
                    style={{ borderTop: settings.theme === 'dark' ? '2px solid #334155' : '2px solid #e2e8f0' }}
                  >
                    <button
                      onClick={() => setShowTestTypeDialog(false)}
                      className="w-full px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{
                        backgroundColor: settings.theme === 'dark' ? '#334155' : '#f1f5f9',
                        color: settings.theme === 'dark' ? '#94a3b8' : '#475569',
                        border: settings.theme === 'dark' ? '2px solid #475569' : '2px solid #cbd5e1'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Header */}
                  <div 
                    className="p-5"
                    style={{ borderBottom: settings.theme === 'dark' ? '2px solid #334155' : '2px solid #e2e8f0' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: settings.theme === 'dark' ? '#064e3b' : '#d1fae5' }}
                      >
                        <svg className="w-6 h-6" style={{ color: settings.theme === 'dark' ? '#6ee7b7' : '#059669' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 
                          className="text-lg font-bold"
                          style={{ color: settings.theme === 'dark' ? '#f1f5f9' : '#1e293b' }}
                        >
                          Choose Mode
                        </h3>
                        <p 
                          className="text-xs"
                          style={{ color: settings.theme === 'dark' ? '#94a3b8' : '#64748b' }}
                        >
                          With lives or just practice?
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="p-5 space-y-3">
                    <button
                      onClick={() => {
                        setTestMode('lives');
                        setShowTestTypeDialog(false);
                        setStudyMode("test");
                        setTestResults(new Map());
                        setCurrentIndex(0);
                        setLives(3);
                        setCurrentStreak(0);
                        setMaxStreak(0);
                        setIsQuizEnded(false);
                        setWrittenAnswer("");
                        setWrittenSubmitted(false);
                      }}
                      className="w-full p-4 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor: settings.theme === 'dark' ? '#991b1b' : '#ef4444',
                        border: '2px solid #dc2626',
                        color: '#ffffff'
                      }}
                    >
                      <div className="text-left">
                        <p className="font-bold text-base mb-1">Lives Mode</p>
                        <p className="text-sm opacity-90">3 lives - game ends when you run out</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setTestMode('practice');
                        setShowTestTypeDialog(false);
                        setStudyMode("test");
                        setTestResults(new Map());
                        setCurrentIndex(0);
                        setLives(999); // Effectively infinite
                        setCurrentStreak(0);
                        setMaxStreak(0);
                        setIsQuizEnded(false);
                        setWrittenAnswer("");
                        setWrittenSubmitted(false);
                      }}
                      className="w-full p-4 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor: settings.theme === 'dark' ? '#065f46' : '#10b981',
                        border: '2px solid #059669',
                        color: '#ffffff'
                      }}
                    >
                      <div className="text-left">
                        <p className="font-bold text-base mb-1">Practice Mode</p>
                        <p className="text-sm opacity-90">No lives - see your score at the end</p>
                      </div>
                    </button>
                  </div>
                  
                  {/* Back button */}
                  <div 
                    className="p-5"
                    style={{ borderTop: settings.theme === 'dark' ? '2px solid #334155' : '2px solid #e2e8f0' }}
                  >
                    <button
                      onClick={() => setTestType(null)}
                      className="w-full px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{
                        backgroundColor: settings.theme === 'dark' ? '#334155' : '#f1f5f9',
                        color: settings.theme === 'dark' ? '#94a3b8' : '#475569',
                        border: settings.theme === 'dark' ? '2px solid #475569' : '2px solid #cbd5e1'
                      }}
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Study Fact - Quiz Mode Info */}
        {studyMode === "test" && currentIndex === 0 && !isQuizEnded && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {getStudyFact("testing", settings.language).text}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {getStudyFact("testing", settings.language).source}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {studyMode === "test" ? (
            <>
              {testMode === 'lives' ? (
                /* Lives Display - WITH HEART EMOJIS */
                <div className="bg-rose-600 dark:bg-rose-700 rounded-md p-6 shadow-2xl shadow-rose-500/50">
                  <p className="text-sm text-white font-black uppercase tracking-wide mb-4 drop-shadow-lg">
                    {t("lives")}
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i} 
                        className={`text-5xl transition-all duration-300 ${
                          i < lives 
                            ? 'scale-110 drop-shadow-2xl' 
                            : 'opacity-30 grayscale'
                        }`}
                      >
                        {i < lives ? '❤️' : '💔'}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Practice Mode - Score Display */
                <div className="bg-indigo-600 rounded-md p-6 shadow-2xl">
                  <p className="text-sm text-white font-black uppercase tracking-wide mb-2 drop-shadow-lg">
                    Score
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-300">{Array.from(testResults.values()).filter(v => v).length}</p>
                      <p className="text-xs text-white/70">Correct</p>
                    </div>
                    <div className="text-2xl text-white/50">/</div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-rose-300">{Array.from(testResults.values()).filter(v => !v).length}</p>
                      <p className="text-xs text-white/70">Wrong</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Streak Display */}
              <div className="bg-amber-500 rounded-md p-5 shadow-lg">
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide mb-2">
                  {t("streak")}
                </p>
                <p className="text-4xl font-bold text-white">
                  {currentStreak > 0 ? currentStreak : '0'}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Progress Display (Review Mode) */}
              <div className="bg-teal-500 rounded-md p-5 shadow-lg">
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide mb-2">
                  {t("progress")}
                </p>
                <p className="text-3xl font-bold text-white">
                  {currentIndex + 1} / {flashcards.length}
                </p>
              </div>

              {/* Mastered Display (Review Mode) */}
              <div className="bg-emerald-500 rounded-md p-5 shadow-lg">
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide mb-2">
                  {t("mastered")}
                </p>
                <p className="text-3xl font-bold text-white">
                  {masteredCards.size} / {flashcards.length}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Quiz Ended (No Lives Left) */}
        {isQuizEnded && studyMode === "test" ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md shadow-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("quiz_ended")}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {testResults.size} {t("questions_answered")} · {Array.from(testResults.values()).filter((v) => v).length} {t("correct")}
              {maxStreak > 1 && ` · ${maxStreak} ${t("max_streak")}`}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={handleRetakeFailedCards}
                className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-md transition-all border-2 border-gray-300 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 active:translate-y-0"
              >
                {t("study_mistakes")}
              </button>
              <button
                onClick={() => {
                  setTestResults(new Map());
                  setCurrentIndex(0);
                  setLives(3);
                  setCurrentStreak(0);
                  setMaxStreak(0);
                  setIsQuizEnded(false);
                }}
                className="px-8 py-4 bg-blue-600 hover:opacity-90 text-white font-bold rounded-md transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              >
                {t("retake_quiz")}
              </button>
            </div>
          </div>
        ) : isTestComplete ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md shadow-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {correctCount === flashcards.length ? t("perfect_score") : t("quiz_complete")}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {correctCount} / {flashcards.length} {t("correct")}
              {maxStreak > 1 && ` · ${t("best_streak")}: ${maxStreak}`}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {incorrectCount > 0 ? (
                <button
                  onClick={handleRetakeFailedCards}
                  className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-md transition-all border-2 border-gray-300 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 active:translate-y-0"
                >
                  {t("study_mistakes")}
                </button>
              ) : null}
              <button
                onClick={() => {
                  setTestResults(new Map());
                  setCurrentIndex(0);
                  setLives(3);
                  setCurrentStreak(0);
                  setMaxStreak(0);
                  setIsQuizEnded(false);
                }}
                className="px-8 py-4 bg-blue-600 hover:opacity-90 text-white font-bold rounded-md transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              >
                {t("retake_quiz")}
              </button>
            </div>
          </div>
        ) : isAllMastered && studyMode === "review" ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md shadow-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("all_done")}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {t("youve_reviewed_all")}
            </p>
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-cyan-600 hover:opacity-90 text-white font-semibold rounded-md transition-all shadow-lg"
            >
              {t("study_again")}
            </button>
          </div>
        ) : studyMode === "review" ? (
          <>
            {/* Review Mode - Flashcard View */}
            <FlashcardCard 
              card={currentCard} 
              isMastered={masteredCards.has(currentCard.id)}
              onRate={handleRateCard}
              currentRating={cardRatings.get(currentCard.id) || null}
            />

            <div className="flex gap-4 mb-8 mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1 px-10 py-5 rounded-md font-black text-lg transition-all duration-200 ease-out hover:-translate-y-1 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-lg hover:shadow-2xl bg-slate-600 hover:opacity-90 text-white disabled:bg-gray-400 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                <span className="flex items-center justify-center gap-3 relative z-10">
                  <ArrowIcon direction="left" size={20} />
                  <span>{t("previous")}</span>
                </span>
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === flashcards.length - 1}
                className="flex-1 px-10 py-5 rounded-md font-black text-lg transition-all duration-200 ease-out hover:-translate-y-1 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-lg hover:shadow-2xl bg-cyan-600 hover:opacity-90 text-white disabled:bg-gray-400 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                <span className="flex items-center justify-center gap-3 relative z-10">
                  <span>{t("next")}</span>
                  <ArrowIcon size={20} />
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Test Mode - Quiz View (No Flashcard) */}
            <div className="w-full max-w-4xl mx-auto mb-8">
              {/* Question Display - Styled Like Flashcard */}
              <div 
                className="relative w-full aspect-[16/9] min-h-[300px] mb-8 rounded-md overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 md:p-12 text-center"
                style={{
                  background: '#06b6d4',
                  boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.5)'
                }}
              >
                <div className="absolute top-6 left-6 flex items-center gap-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white font-bold tracking-widest uppercase text-xs backdrop-blur-md border border-white/20">
                    Question {currentIndex + 1}
                  </span>
                  <span className="text-xs font-medium text-white/80">
                    {testResults.size} / {flashcards.length} answered
                  </span>
                </div>
                
                <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-relaxed drop-shadow-md max-w-3xl">
                  {currentCard.question}
                </h2>
                
                <div className="absolute bottom-6 right-6 text-white/20">
                   <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
              </div>

              {/* Answer Options - Written, Multiple Choice, or Self-Assessment */}
              {testType === 'written' ? (
                /* Written Mode */
                <div className="space-y-6 max-w-2xl mx-auto">
                  {!writtenSubmitted ? (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                        Type your answer
                      </p>
                      <input
                        type="text"
                        value={writtenAnswer}
                        onChange={(e) => setWrittenAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && writtenAnswer.trim()) {
                            const isCorrect = checkWrittenAnswer(writtenAnswer, currentCard.answer);
                            setWrittenSubmitted(true);
                            setIsAnswerCorrect(isCorrect);
                            setSelectedAnswer(writtenAnswer);
                            
                            const newResults = new Map(testResults);
                            newResults.set(currentCard.id, isCorrect);
                            setTestResults(newResults);
                            
                            if (isCorrect) {
                              const newStreak = currentStreak + 1;
                              setCurrentStreak(newStreak);
                              setMaxStreak(Math.max(maxStreak, newStreak));
                            } else {
                              setCurrentStreak(0);
                              // Generate explanation for wrong answer
                              generateExplanation(currentCard.question, currentCard.answer, writtenAnswer);
                              if (testMode === 'lives') {
                                const newLives = lives - 1;
                                setLives(newLives);
                                if (newLives <= 0) {
                                  setIsQuizEnded(true);
                                }
                              }
                            }
                          }
                        }}
                        placeholder="Your answer..."
                        className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white text-lg"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (!writtenAnswer.trim()) return;
                          const isCorrect = checkWrittenAnswer(writtenAnswer, currentCard.answer);
                          setWrittenSubmitted(true);
                          setIsAnswerCorrect(isCorrect);
                          setSelectedAnswer(writtenAnswer);
                          
                          const newResults = new Map(testResults);
                          newResults.set(currentCard.id, isCorrect);
                          setTestResults(newResults);
                          
                          if (isCorrect) {
                            const newStreak = currentStreak + 1;
                            setCurrentStreak(newStreak);
                            setMaxStreak(Math.max(maxStreak, newStreak));
                          } else {
                            setCurrentStreak(0);
                            // Generate explanation for wrong answer
                            generateExplanation(currentCard.question, currentCard.answer, writtenAnswer);
                            if (testMode === 'lives') {
                              const newLives = lives - 1;
                              setLives(newLives);
                              if (newLives <= 0) {
                                setIsQuizEnded(true);
                              }
                            }
                          }
                        }}
                        disabled={!writtenAnswer.trim()}
                        className="w-full mt-4 py-4 bg-blue-600 hover:opacity-90 text-white font-bold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Check Answer
                      </button>
                      <p className="text-sm text-gray-400 mt-3 text-center">
                        Small typos are accepted
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
                      <div className={`p-6 rounded-lg mb-4 ${isAnswerCorrect ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">{isAnswerCorrect ? '✅' : '❌'}</span>
                          <p className={`font-bold text-xl ${isAnswerCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isAnswerCorrect 
                              ? 'Correct!' 
                              : 'Incorrect'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Your answer: </span>
                            <span className={isAnswerCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 line-through'}>{writtenAnswer}</span>
                          </p>
                          {!isAnswerCorrect && (
                            <p className="text-gray-600 dark:text-gray-300">
                              <span className="font-medium">Correct answer: </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentCard.answer}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Explanation for wrong answer */}
                      {!isAnswerCorrect && (
                        <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <span className="text-xl">ℹ️</span>
                            <div className="flex-1">
                              <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                                Explanation
                              </p>
                              {isLoadingExplanation ? (
                                <p className="text-blue-600 dark:text-blue-400 text-sm animate-pulse">
                                  Generating explanation...
                                </p>
                              ) : explanation ? (
                                <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                                  {explanation}
                                </p>
                              ) : (
                                <p className="text-blue-600 dark:text-blue-400 text-sm italic">
                                  No explanation available
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : quizOptions.length > 0 ? (
                /* Multiple Choice Quiz */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizOptions.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = option === currentCard.answer;
                    const showFeedback = selectedAnswer !== null;
                    
                    let buttonClass = "w-full p-6 text-left font-bold text-lg rounded-md transition-all duration-300 relative overflow-hidden group ";
                    let bgStyle = {};
                    
                    if (showFeedback) {
                      if (isCorrectOption) {
                        // Always highlight the correct answer in green
                        buttonClass += "bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 transform scale-[1.02] z-10";
                      } else if (isSelected && !isCorrectOption) {
                        // Highlight the incorrect selection in red
                        buttonClass += "bg-red-600 text-white opacity-90";
                      } else {
                        // Other options are dimmed
                        buttonClass += "bg-slate-800 text-slate-500 opacity-40 blur-[1px]";
                      }
                    } else {
                      // Before selection - clean interactive state
                      buttonClass += "bg-slate-800 text-white hover:bg-slate-700 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer shadow-md";
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuizAnswer(option)}
                        disabled={selectedAnswer !== null}
                        className={buttonClass}
                      >
                         {!showFeedback && (
                           <span className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/50 to-blue-50/0 dark:from-blue-900/0 dark:via-blue-900/10 dark:to-blue-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                         )}
                        <div className="flex items-center justify-between relative z-10">
                          <span className="leading-snug pr-8">{option}</span>
                          {showFeedback && isCorrectOption && <span className="text-emerald-600 dark:text-emerald-400 text-2xl animate-in zoom-in spin-in-180 duration-300">✅</span>}
                          {showFeedback && isSelected && !isCorrectOption && <span className="text-rose-600 dark:text-rose-400 text-2xl animate-in zoom-in duration-300">❌</span>}
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Explanation for wrong answer - Multiple Choice */}
                  {selectedAnswer !== null && !isAnswerCorrect && (
                    <div className="col-span-full mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">ℹ️</span>
                        <div className="flex-1">
                          <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                            Explanation
                          </p>
                          {isLoadingExplanation ? (
                            <p className="text-blue-600 dark:text-blue-400 text-sm animate-pulse">
                              Generating explanation...
                            </p>
                          ) : explanation ? (
                            <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                              {explanation}
                            </p>
                          ) : (
                            <p className="text-blue-600 dark:text-blue-400 text-sm italic">
                              No explanation available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Self-Assessment for Math Problems */
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Show answer */}
                  <div className="bg-slate-900 text-white rounded-md p-8 shadow-xl text-center relative overflow-hidden">
                    <p className="text-sm font-bold text-white/60 mb-4 uppercase tracking-widest">
                      {t("answer")}
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {currentCard.answer}
                    </p>
                  </div>

                  {/* Self-assessment buttons */}
                  {selectedAnswer === null ? (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-md shadow-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">
                        How did you do?
                      </p>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => handleQuizAnswer('wrong')}
                          className="flex-1 py-6 bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-md transition-all hover:-translate-y-1 hover:shadow-xl shadow-rose-100 dark:shadow-rose-900/10 group"
                        >
                          <span className="flex flex-col items-center gap-2">
                            <span className="text-4xl group-hover:scale-110 transition-transform">😫</span>
                            <span>Wrong</span>
                          </span>
                        </button>
                        <button
                          onClick={() => handleQuizAnswer('ok')}
                          className="flex-1 py-6 bg-slate-100 dark:bg-slate-900 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-md transition-all hover:-translate-y-1 hover:shadow-xl shadow-amber-100 dark:shadow-amber-900/10 group"
                        >
                          <span className="flex flex-col items-center gap-2">
                            <span className="text-4xl group-hover:scale-110 transition-transform">😐</span>
                            <span>OK</span>
                          </span>
                        </button>
                        <button
                          onClick={() => handleQuizAnswer('correct')}
                          className="flex-1 py-6 bg-slate-100 dark:bg-slate-900 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-md transition-all hover:-translate-y-1 hover:shadow-xl shadow-emerald-100 dark:shadow-emerald-900/10 group"
                        >
                          <span className="flex flex-col items-center gap-2">
                            <span className="text-4xl group-hover:scale-110 transition-transform">🤩</span>
                            <span>Correct</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Feedback Message - Clean Modern Floating Bar */}
              {(selectedAnswer !== null || writtenSubmitted) && (
                <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-3xl z-50">
                  <div className={`p-4 rounded-md shadow-2xl backdrop-blur-xl border-2 transform transition-all animate-in slide-in-from-bottom duration-300 ${
                    isAnswerCorrect 
                      ? 'bg-white/95 dark:bg-gray-900/95 border-emerald-500 text-gray-900 dark:text-white' 
                      : 'bg-white/95 dark:bg-gray-900/95 border-rose-500 text-gray-900 dark:text-white'
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      
                      {/* Icon & Message */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                          isAnswerCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {isAnswerCorrect ? '✓' : '✕'}
                        </div>
                        
                        <div className="min-w-0">
                          <p className={`font-black text-lg leading-none mb-1 ${
                            isAnswerCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isAnswerCorrect ? t("correct") + "!" : t("incorrect")}
                          </p>
                          
                          {/* Show answer if incorrect (not for written mode - already shown inline) */}
                          {!isAnswerCorrect && currentCard.answer && testType !== 'written' && (
                            <p className="text-sm font-medium opacity-90 truncate max-w-[200px] md:max-w-md">
                              <span className="opacity-60 mr-1">{t("correct_answer_prefix")}:</span>
                              {currentCard.answer}
                            </p>
                          )}
                          
                           {/* Show streak if correct */}
                           {isAnswerCorrect && currentStreak > 1 && (
                            <p className="text-sm font-bold text-orange-500">
                              ⚡ {currentStreak} {t("streak")}
                            </p>
                           )}
                        </div>
                      </div>
                      
                      {/* Next Button */}
                      <button 
                        onClick={handleNext} 
                        className={`px-6 py-3 rounded-md font-bold text-white shadow-lg transition-transform active:scale-95 flex-shrink-0 ${
                          isAnswerCorrect 
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' 
                            : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                        }`}
                      >
                        {currentIndex < flashcards.length - 1 ? t("next") : t("finish")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onSkip={() => setShowLoginModal(false)} 
        />
      )}
      
      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Premium upsell banner — free users only */}
      {!isPremium && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0c1a2e 100%)',
            borderTop: '1px solid rgba(6,182,212,0.35)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">⚡</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Unlock Premium — 50 cards/set, PDF uploads &amp; AI coach</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>$8.99/month or $79.99/year</p>
            </div>
          </div>
          <a
            href="/pricing"
            className="px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: '#fff' }}
          >
            Get Premium →
          </a>
        </div>
      )}
    </div>
  );
}

