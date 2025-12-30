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

type StudyMode = "review" | "test";

interface StudyViewProps {
  flashcards: Flashcard[];
  currentSetId: string | null;
  onBack: () => void;
}

interface ToastMessage {
  message: string;
  type: ToastType;
}

export default function StudyView({ flashcards: initialFlashcards, currentSetId, onBack }: StudyViewProps) {
  const t = useTranslation();
  const { settings } = useSettings();
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
  
  // Gamification state (Quiz Mode only)
  const [lives, setLives] = useState(3);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isQuizEnded, setIsQuizEnded] = useState(false);
  
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
        if (Math.abs(correctAnswer.length - card.answer.length) < 10) {
          score += 2;
        }
        
        // Same word count
        if (answerWords.length === otherWords.length) {
          score += 3;
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
        if (lengthDiff > 20) score -= 5;
        
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

  // Generate quiz options when current question changes in test mode
  useEffect(() => {
    if (studyMode === "test" && currentCard && !testResults.has(currentCard.id)) {
      // For math problems without distractors, we'll use self-assessment instead of quiz
      const hasMathQuiz = currentCard.distractors && currentCard.distractors.length > 0;
      if (hasMathQuiz || !isMathQuestion(currentCard.question)) {
        setQuizOptions(generateQuizOptions(currentCard.answer, flashcards));
      } else {
        setQuizOptions([]); // Empty means use self-assessment
      }
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    }
  }, [currentIndex, studyMode, currentCard, flashcards, testResults]);
  // Detect if question is math-related
  const isMathQuestion = (question: string): boolean => {
    const mathPatterns = [
      /solve|calculate|løs|regn/i,
      /\d+\s*[+\-*/×÷]\s*\d+/,
      /=\s*\?/,
      /[xyz]\s*[=+\-*/]/i,
      /\d+x/i,
      /equation|likning/i
    ];
    return mathPatterns.some(pattern => pattern.test(question));
  };
  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
      showToast(t("enter_name_for_set"), "warning");
      return;
    }
    
    try {
      await saveFlashcardSet(setName, flashcards);
      setShowSaveDialog(false);
      setSetName("");
      showToast(t("set_saved_successfully"), "success");
      
      // Only show login modal if user is NOT logged in
      if (ENABLE_LOGIN_MODAL && !isLoggedIn) {
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error('[StudyView] Error saving flashcard set:', error);
      showToast(t("save_failed") || "Failed to save flashcard set", "error");
    }
  };

  const handleShare = async () => {
    // Share feature disabled for initial launch
    if (!ENABLE_SHARE) {
      return;
    }
    
    if (!currentSetId) {
      showToast(t("save_before_sharing"), "warning");
      return;
    }

    try {
      const result = await shareFlashcardSet(currentSetId);
      if (result) {
        setShareUrl(result.shareUrl);
        setShowShareDialog(true);
      } else {
        showToast(t("share_link_failed"), "error");
      }
    } catch (error) {
      console.error('Share error:', error);
      showToast(t("share_link_failed"), "error");
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    showToast(t("link_copied_clipboard"), "success");
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
      const newLives = lives - 1;
      setLives(newLives);
      
      // End quiz if no lives left
      if (newLives <= 0) {
        setIsQuizEnded(true);
        return; // Don't auto-advance
      }
    }
    
    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 1500);
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
  };

  const isTestComplete = studyMode === "test" && testResults.size === flashcards.length;
  const correctCount = Array.from(testResults.values()).filter((v) => v).length;
  const incorrectCount = testResults.size - correctCount;

  const isAllMastered = masteredCards.size === flashcards.length;

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={onBack}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold transition-all duration-300 rounded-3xl hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:scale-105 flex items-center gap-2"
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
            className={`px-8 py-4 font-black text-base rounded-2xl transition-all duration-500 ease-out transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl ${
              studyMode === "review"
                ? "bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 text-white shadow-teal-500/50 ring-4 ring-teal-300/40"
                : "bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 text-teal-700 dark:text-teal-300 hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/30 dark:hover:to-cyan-900/30 shadow-teal-200/50 hover:shadow-teal-300/60"
            }`}
          >
            📚 {t("study")}
          </button>
          <button
            onClick={() => {
              setStudyMode("test");
              setTestResults(new Map());
              setCurrentIndex(0);
              setLives(3);
              setCurrentStreak(0);
              setMaxStreak(0);
              setIsQuizEnded(false);
            }}
            className={`px-8 py-4 font-black text-base rounded-2xl transition-all duration-500 ease-out transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl ${
              studyMode === "test"
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 text-white shadow-indigo-500/50 ring-4 ring-indigo-300/40"
                : "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 text-indigo-700 dark:text-indigo-300 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 shadow-indigo-200/50 hover:shadow-indigo-300/60"
            }`}
          >
            <span>🎯 {t("test_yourself")}</span>
          </button>
          <button
            onClick={handleShuffle}
            disabled={studyMode === "test"}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-base rounded-2xl transition-all duration-500 ease-out shadow-lg hover:shadow-2xl hover:shadow-amber-400/50 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            🔀 {t("shuffle")}
          </button>
          {/* Share button - DISABLED for production launch */}
          {ENABLE_SHARE && currentSetId && (
            <button
              onClick={handleShare}
              className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 hover:shadow-lg transform hover:scale-105"
            >
              {t("share")}
            </button>
          )}
          {!currentSetId && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-black text-base rounded-2xl transition-all duration-500 ease-out shadow-lg hover:shadow-2xl hover:shadow-violet-400/50 transform hover:scale-105 hover:-translate-y-1"
            >
              💾 {t("save")}
            </button>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="card-elevated p-8 mb-8" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("save_this_set")}
            </h3>
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder={t("name_your_set")}
              className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white mb-6 text-base"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveSet}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all shadow-lg"
              >
                {t("save")}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSetName("");
                }}
                className="flex-1 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl transition-all border border-gray-200 dark:border-gray-700"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Share Dialog - DISABLED for production launch */}
        {ENABLE_SHARE && showShareDialog && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔗</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t("share_study_set")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("anyone_can_view")}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 break-all font-mono">
                {shareUrl}
              </p>
            </div>

            {/* Study fact in share dialog */}
            <div className="mb-6">
              <StudyFactBadge context="general" position="inline" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyShareLink}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all shadow-lg"
              >
                {t("copy_link")}
              </button>
              <button
                onClick={() => setShowShareDialog(false)}
                className="flex-1 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl transition-all border border-gray-200 dark:border-gray-700"
              >
                {t("close")}
              </button>
            </div>

            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              💡 {t("tip_sign_in")}
            </p>
          </div>
        )}

        {/* Study Fact - Quiz Mode Info */}
        {studyMode === "test" && currentIndex === 0 && !isQuizEnded && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
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
              {/* Lives Display - WITH HEART EMOJIS */}
              <div className="bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 dark:from-rose-600 dark:via-pink-700 dark:to-red-700 rounded-3xl p-6 shadow-2xl shadow-rose-500/50">
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

              {/* Streak Display - WITH FIRE EMOJI */}
              <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 dark:from-orange-600 dark:via-amber-700 dark:to-yellow-700 rounded-3xl p-6 shadow-2xl shadow-orange-500/50">
                <p className="text-sm text-white font-black uppercase tracking-wide mb-4 drop-shadow-lg">
                  {t("streak")}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {currentStreak > 0 && (
                    <span className="text-4xl animate-pulse">🔥</span>
                  )}
                  <p className="text-5xl font-black text-white drop-shadow-2xl">
                    {currentStreak > 0 ? currentStreak : '0'}
                  </p>
                  {currentStreak > 0 && (
                    <span className="text-4xl animate-pulse">🔥</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Progress Display (Review Mode) - NEW COLORS */}
              <div className="bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 dark:from-teal-600 dark:via-cyan-700 dark:to-blue-700 rounded-3xl p-6 shadow-2xl shadow-teal-500/50">
                <p className="text-sm text-white font-black uppercase tracking-wide mb-4 drop-shadow-lg">
                  📊 {t("progress")}
                </p>
                <p className="text-4xl font-black text-white drop-shadow-2xl">
                  {currentIndex + 1} / {flashcards.length}
                </p>
              </div>

              {/* Mastered Display (Review Mode) - NEW COLORS */}
              <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 dark:from-emerald-600 dark:via-green-700 dark:to-teal-700 rounded-3xl p-6 shadow-2xl shadow-emerald-500/50">
                <p className="text-sm text-white font-black uppercase tracking-wide mb-4 drop-shadow-lg">
                  ✨ {t("mastered")}
                </p>
                <p className="text-4xl font-black text-white drop-shadow-2xl">
                  {masteredCards.size} / {flashcards.length}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Quiz Ended (No Lives Left) */}
        {isQuizEnded && studyMode === "test" ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
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
                className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all border-2 border-gray-300 dark:border-gray-700 hover:shadow-lg hover:scale-105"
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
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {t("retake_quiz")}
              </button>
            </div>
          </div>
        ) : isTestComplete ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {correctCount === flashcards.length ? t("perfect_score") : t("quiz_complete")}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {correctCount} / {flashcards.length} {t("correct")}
              {maxStreak > 1 && ` · ${t("best_streak")}: ${maxStreak}`}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {incorrectCount > 0 && (
                <button
                  onClick={handleRetakeFailedCards}
                  className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all border-2 border-gray-300 dark:border-gray-700 hover:shadow-lg hover:scale-105"
                >
                  {t("study_mistakes")}
                </button>
              )}
              <button
                onClick={() => {
                  setTestResults(new Map());
                  setCurrentIndex(0);
                  setLives(3);
                  setCurrentStreak(0);
                  setMaxStreak(0);
                  setIsQuizEnded(false);
                }}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {t("retake_quiz")}
              </button>
            </div>
          </div>
        ) : isAllMastered && studyMode === "review" ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("all_done")}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {t("youve_reviewed_all")}
            </p>
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all shadow-lg"
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
                className="flex-1 px-10 py-5 rounded-2xl font-black text-lg transition-all duration-500 ease-out transform hover:scale-105 hover:-translate-y-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-2xl bg-gradient-to-br from-slate-500 via-gray-600 to-slate-700 hover:from-slate-400 hover:via-gray-500 hover:to-slate-600 text-white disabled:from-gray-300 disabled:to-gray-400 relative overflow-hidden group"
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
                className="flex-1 px-10 py-5 rounded-2xl font-black text-lg transition-all duration-500 ease-out transform hover:scale-105 hover:-translate-y-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-2xl bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 hover:from-teal-400 hover:via-cyan-500 hover:to-blue-500 text-white disabled:from-gray-300 disabled:to-gray-400 relative overflow-hidden group"
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
              {/* Question Display - Plain Text, Non-Interactive */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    Question {currentIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {testResults.size} / {flashcards.length} answered
                  </span>
                </div>
                
                {/* Math indicator */}
                {isMathQuestion(currentCard.question) && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <span>✏️</span>
                      <span>{t("use_pen_paper")}</span>
                    </p>
                  </div>
                )}
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
                  {currentCard.question}
                </h2>
              </div>

              {/* Answer Options or Self-Assessment */}
              {quizOptions.length > 0 ? (
                /* Multiple Choice Quiz */
                <div className="space-y-4">
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <span>👉</span>
                    <span>Select the correct answer:</span>
                  </p>
                  {quizOptions.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = option === currentCard.answer;
                    const showFeedback = selectedAnswer !== null;
                    
                    let buttonClass = "w-full px-6 py-5 text-left font-black text-lg rounded-2xl transition-all duration-500 ease-out transform ";
                    
                    if (showFeedback) {
                      if (isCorrectOption) {
                        // Always highlight the correct answer in green
                        buttonClass += "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-2xl shadow-green-500/50 scale-105 celebrate";
                      } else if (isSelected && !isCorrectOption) {
                        // Highlight the incorrect selection in red
                        buttonClass += "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-2xl shadow-red-500/50 scale-105 shake";
                      } else {
                        // Other options are dimmed
                        buttonClass += "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 opacity-40";
                      }
                    } else {
                      // Before selection - colorful interactive state
                      buttonClass += "bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 hover:scale-105 hover:shadow-xl cursor-pointer shadow-lg hover:shadow-blue-300/50";
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuizAnswer(option)}
                        disabled={selectedAnswer !== null}
                        className={buttonClass}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{option}</span>
                          {showFeedback && isCorrectOption && <span className="text-2xl">✓</span>}
                          {showFeedback && isSelected && !isCorrectOption && <span className="text-2xl">✗</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Self-Assessment for Math Problems */
                <div className="space-y-6">
                  {/* Show answer */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-6">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
                      {t("answer")}:
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {currentCard.answer}
                    </p>
                  </div>

                  {/* Self-assessment buttons */}
                  {selectedAnswer === null ? (
                    <div>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 text-center">
                        {settings.language === 'no' ? 'Hvordan gikk det?' : 'How did you do?'}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleQuizAnswer('wrong')}
                          className="px-6 py-4 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:scale-110 hover:-translate-y-1 hover:shadow-xl border-2 border-red-700"
                        >
                          <div className="text-3xl mb-1">❌</div>
                          <div className="text-sm font-bold">{settings.language === 'no' ? 'Feil' : 'Wrong'}</div>
                        </button>
                        <button
                          onClick={() => handleQuizAnswer('ok')}
                          className="px-6 py-4 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:scale-110 hover:-translate-y-1 hover:shadow-xl border-2 border-yellow-700"
                        >
                          <div className="text-3xl mb-1">⚠️</div>
                          <div className="text-sm font-bold">OK</div>
                        </button>
                        <button
                          onClick={() => handleQuizAnswer('correct')}
                          className="px-6 py-4 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:scale-110 hover:-translate-y-1 hover:shadow-xl border-2 border-green-700"
                        >
                          <div className="text-3xl mb-1">✅</div>
                          <div className="text-sm font-bold">{settings.language === 'no' ? 'Riktig' : 'Correct'}</div>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Feedback Message */}
              {selectedAnswer !== null && (
                <div className={`mt-6 p-6 rounded-3xl border-2 ${
                  isAnswerCorrect 
                    ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-300 dark:border-green-700 celebrate' 
                    : 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/40 dark:to-red-900/40 border-orange-300 dark:border-orange-700 shake'
                }`}>
                  <p className={`text-center font-black text-2xl flex items-center justify-center gap-3 ${
                    isAnswerCorrect ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {isAnswerCorrect ? (
                      <>
                        {currentStreak >= 5 ? (
                          <>
                            <span className="text-4xl animate-bounce">🎉</span>
                            <span>ON FIRE! {currentStreak} in a row!</span>
                            <span className="text-4xl fire-flicker">🔥</span>
                          </>
                        ) : currentStreak >= 3 ? (
                          <>
                            <span className="text-3xl">⚡</span>
                            <span>Amazing! {currentStreak} streak!</span>
                            <span className="text-3xl fire-flicker">🔥</span>
                          </>
                        ) : currentStreak === 1 ? (
                          <>
                            <span className="text-3xl">✅</span>
                            <span>Perfect!</span>
                            <span className="text-3xl">🌟</span>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl">✓</span>
                            <span>Nice work!</span>
                          </>
                        )}
                      </>
                    ) : lives > 0 ? (
                      <>
                        <span className="text-3xl">💪</span>
                        <span>{t("keep_going_msg")}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">😬</span>
                        <span>{t("practice_msg")}</span>
                      </>
                    )}
                  </p>
                  {!isAnswerCorrect && (
                    <p className="text-center text-sm text-gray-700 dark:text-gray-300 mt-2">
                      {t("correct_answer_prefix")} <span className="font-semibold text-blue-600 dark:text-blue-400">{currentCard.answer}</span>
                    </p>
                  )}
                  {isAnswerCorrect && currentStreak > 0 && (
                    <p className="text-center text-sm text-purple-600 dark:text-purple-400 mt-2">
                      {currentStreak >= 5 ? t("on_fire_msg") + " 🌟" : t("keep_it_up_msg")}
                    </p>
                  )}
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
    </div>
  );
}
