"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  options: string[];
  explanation?: string;
}

interface QuizViewProps {
  questions: QuizQuestion[];
  subject: string;
  onBack: () => void;
}

export default function QuizView({ questions, subject, onBack }: QuizViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(new Array(questions.length).fill(false));
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [quizMode, setQuizMode] = useState<'instant' | 'end' | null>(null);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>(new Array(questions.length).fill(null));
  const [showingReview, setShowingReview] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered && quizMode === 'instant') return;
    if (quizMode === 'end' && userAnswers[currentQuestionIndex] !== null) return;
    
    setSelectedAnswer(answer);
    
    // Track user answers for end-mode review
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newUserAnswers);
    
    if (quizMode === 'instant') {
      setIsAnswered(true);
      const isCorrect = answer === currentQuestion.correctAnswer;
      if (isCorrect) {
        setScore(score + 1);
      }
      const newAnswered = [...answeredQuestions];
      newAnswered[currentQuestionIndex] = true;
      setAnsweredQuestions(newAnswered);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex + 1]);
      if (quizMode === 'instant') {
        setIsAnswered(false);
        setSelectedAnswer(null);
      }
    } else {
      if (quizMode === 'end') {
        // Calculate score at the end — show results screen first
        let finalScore = 0;
        for (let i = 0; i < questions.length; i++) {
          if (userAnswers[i] === questions[i].correctAnswer) finalScore++;
        }
        setScore(finalScore);
      }
      setIsQuizComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setAnsweredQuestions(new Array(questions.length).fill(false));
    setIsQuizComplete(false);
    setUserAnswers(new Array(questions.length).fill(null));
    setShowingReview(false);
    setQuizMode(null);
  };

  const getOptionStyle = (option: string) => {
    // In "end" mode during answering, just show selected state
    if (quizMode === 'end' && !showingReview) {
      const isSelected = option === selectedAnswer;
      return {
        backgroundColor: isSelected 
          ? (isDarkMode ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.15)")
          : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
        border: isSelected
          ? "2px solid #06b6d4"
          : `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        color: isSelected ? "#06b6d4" : (isDarkMode ? "#ffffff" : "#000000"),
      };
    }
    
    // In review mode after "end" quiz
    if (showingReview) {
      const isCorrect = option === currentQuestion.correctAnswer;
      const isUserAnswer = option === userAnswers[currentQuestionIndex];
      
      if (isCorrect) {
        return {
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          border: "2px solid #22c55e",
          color: "#22c55e",
        };
      }
      if (isUserAnswer && !isCorrect) {
        return {
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          border: "2px solid #ef4444",
          color: "#ef4444",
        };
      }
      return {
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        border: `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
        color: isDarkMode ? "#5f6368" : "#5f6368",
      };
    }

    if (!isAnswered) {
      return {
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        border: `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        color: isDarkMode ? "#ffffff" : "#000000",
      };
    }

    const isCorrect = option === currentQuestion.correctAnswer;
    const isSelected = option === selectedAnswer;

    if (isCorrect) {
      return {
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        border: "2px solid #22c55e",
        color: "#22c55e",
      };
    }

    if (isSelected && !isCorrect) {
      return {
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        border: "2px solid #ef4444",
        color: "#ef4444",
      };
    }

    return {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
      border: `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
      color: isDarkMode ? "#5f6368" : "#5f6368",
    };
  };

  if (!quizMode) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
        <div className="max-w-md w-full mx-4">
          <div className="rounded-3xl p-8 text-center" style={{ 
            backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.8)" : "rgba(255,255,255,0.9)",
            border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            boxShadow: isDarkMode ? 'none' : '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <div className="text-4xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
              Quiz Mode
            </h2>
            <p className="text-sm mb-6" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>
              {questions.length} questions from {subject}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => setQuizMode('instant')}
                className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: isDarkMode ? "rgba(6, 182, 212, 0.1)" : "rgba(6, 182, 212, 0.08)",
                  border: "2px solid rgba(6, 182, 212, 0.3)",
                  color: isDarkMode ? "#ffffff" : "#000000",
                }}
              >
                <div className="font-semibold mb-1">Instant Feedback</div>
                <div className="text-xs" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>
                  See if you&apos;re right or wrong after each question
                </div>
              </button>
              
              <button
                onClick={() => setQuizMode('end')}
                className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  border: `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  color: isDarkMode ? "#ffffff" : "#000000",
                }}
              >
                <div className="font-semibold mb-1">Review at End</div>
                <div className="text-xs" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>
                  Answer all questions first, then see your results
                </div>
              </button>
            </div>

            <button onClick={onBack} className="mt-4 text-sm transition-colors hover:opacity-80" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isQuizComplete && !showingReview) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div 
            className="rounded-3xl p-8 text-center"
            style={{ 
              backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.8)" : "rgba(255,255,255,0.8)",
              border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            }}
          >
            <div className="text-6xl mb-4">{passed ? "🎉" : "📚"}</div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
              Quiz Complete!
            </h2>
            <p className="text-lg mb-6" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              {passed ? "Great job!" : "Keep studying!"}
            </p>

            <div className="flex justify-center gap-4 mb-8">
              <div 
                className="px-8 py-4 rounded-xl"
                style={{ backgroundColor: passed ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)" }}
              >
                <p className="text-4xl font-black" style={{ color: passed ? "#22c55e" : "#ef4444" }}>
                  {score}/{questions.length}
                </p>
                <p className="text-sm mt-1" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  {percentage}% correct
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              {quizMode === 'end' && (
                <button
                  onClick={() => { setShowingReview(true); setIsQuizComplete(false); setCurrentQuestionIndex(0); }}
                  className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                  style={{ 
                    background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)",
                    color: "#ffffff",
                  }}
                >
                  📋 Review Answers
                </button>
              )}
              <button
                onClick={handleRetry}
                className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.2)" : "rgba(26, 115, 232, 0.1)",
                  color: "#1a73e8",
                  border: "2px solid rgba(26, 115, 232, 0.3)"
                }}
              >
                🔄 Retry Quiz
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  color: isDarkMode ? "#ffffff" : "#000000",
                }}
              >
                ← Back to Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px]" 
          style={{ backgroundColor: isDarkMode ? 'rgba(26, 115, 232, 0.1)' : 'rgba(26, 115, 232, 0.05)' }} />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full blur-[100px]" 
          style={{ backgroundColor: isDarkMode ? 'rgba(52, 168, 83, 0.08)' : 'rgba(52, 168, 83, 0.04)' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 transition-colors hover:opacity-80"
            style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="text-right">
            <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Score</p>
            <p className="text-2xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              {score}/{questions.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div 
          className="h-2 rounded-full mb-8 overflow-hidden"
          style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}
        >
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)"
            }}
          />
        </div>

        {/* Question Card */}
        <div 
          className="rounded-3xl p-8 mb-6"
          style={{ 
            backgroundColor: isDarkMode ? "rgba(15, 29, 50, 0.8)" : "rgba(255,255,255,0.8)",
            border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          <p className="text-sm font-medium mb-4" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>

          <h3 
            className="text-2xl font-bold mb-8"
            style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
            dangerouslySetInnerHTML={{ 
              __html: currentQuestion.question
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
            }}
          />

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={
                  (quizMode === 'instant' && isAnswered) || 
                  showingReview ||
                  (quizMode === 'end' && userAnswers[currentQuestionIndex] !== null)
                }
                className="w-full p-4 rounded-xl text-left font-medium transition-all duration-200 disabled:cursor-not-allowed hover:scale-[1.02]"
                style={getOptionStyle(option)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold"
                    style={{ 
                      backgroundColor: "rgba(255,255,255,0.1)",
                      color: "inherit"
                    }}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span 
                    dangerouslySetInnerHTML={{ 
                      __html: option
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        .replace(/\*(.*?)\*/g, '<i>$1</i>')
                    }}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Instant mode: show feedback right after answering */}
          {quizMode === 'instant' && isAnswered && (
            <div className="mt-6">
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <div 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}
                >
                  <p className="font-medium">✅ Correct!</p>
                </div>
              ) : (
                <div 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
                >
                  <p className="font-medium">❌ Incorrect</p>
                  <p className="text-sm mt-1">The correct answer is: <b>{currentQuestion.correctAnswer}</b></p>
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full mt-4 px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)",
                  color: "#ffffff"
                }}
              >
                {currentQuestionIndex < questions.length - 1 ? "Next Question →" : "View Results"}
              </button>
            </div>
          )}
          
          {/* End mode: show Next button after selecting, review mode shows results */}
          {quizMode === 'end' && !showingReview && selectedAnswer && (
            <div className="mt-6">
              <button
                onClick={handleNext}
                className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)",
                  color: "#ffffff"
                }}
              >
                {currentQuestionIndex < questions.length - 1 ? "Next Question →" : "Submit Quiz"}
              </button>
            </div>
          )}
          
          {/* Review mode after end-mode quiz */}
          {showingReview && (
            <div className="mt-6">
              {userAnswers[currentQuestionIndex] === currentQuestion.correctAnswer ? (
                <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
                  <p className="font-medium">✅ Correct!</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                  <p className="font-medium">❌ Incorrect — you answered: {userAnswers[currentQuestionIndex]}</p>
                  <p className="text-sm mt-1">The correct answer is: <b>{currentQuestion.correctAnswer}</b></p>
                </div>
              )}
              
              <div className="flex gap-3 mt-4">
                {currentQuestionIndex > 0 && (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                    className="flex-1 px-6 py-3 rounded-xl font-medium transition-all"
                    style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", color: isDarkMode ? "#ffffff" : "#000000" }}
                  >
                    ← Previous
                  </button>
                )}
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="flex-1 px-6 py-3 rounded-xl font-medium transition-all"
                    style={{ background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)", color: "#ffffff" }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowingReview(false); setIsQuizComplete(true); }}
                    className="flex-1 px-6 py-3 rounded-xl font-medium transition-all"
                    style={{ background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)", color: "#ffffff" }}
                  >
                    Back to Results
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

