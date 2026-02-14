"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface MatchCard {
  id: string;
  content: string;
  type: "term" | "definition";
  matchId: string;
  isMatched: boolean;
}

interface MatchGameProps {
  terms: string[];
  definitions: string[];
  subject: string;
  onBack: () => void;
}

export default function MatchGame({ terms, definitions, subject, onBack }: MatchGameProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchCard[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Initialize cards
  useEffect(() => {
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const initialCards: MatchCard[] = [];
    
    // Create cards from terms and definitions
    terms.forEach((term, index) => {
      if (index < definitions.length) {
        const matchId = `match-${index}`;
        initialCards.push({
          id: `term-${index}`,
          content: term,
          type: "term",
          matchId,
          isMatched: false,
        });
        initialCards.push({
          id: `def-${index}`,
          content: definitions[index],
          type: "definition",
          matchId,
          isMatched: false,
        });
      }
    });

    setCards(shuffleArray(initialCards));
  }, [terms, definitions]);

  // Timer
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardClick = (card: MatchCard) => {
    if (card.isMatched) return;
    if (selectedCards.find(c => c.id === card.id)) return;

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setAttempts(attempts + 1);

      // Check if they match
      if (newSelected[0].matchId === newSelected[1].matchId && newSelected[0].type !== newSelected[1].type) {
        // Match found!
        setTimeout(() => {
          setCards(cards.map(c => 
            c.matchId === newSelected[0].matchId ? { ...c, isMatched: true } : c
          ));
          setMatches(matches + 1);
          setSelectedCards([]);

          // Check if game is complete
          if (matches + 1 === terms.length) {
            setGameComplete(true);
            setIsTimerRunning(false);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  const handleRestart = () => {
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    setCards(shuffleArray(cards.map(c => ({ ...c, isMatched: false }))));
    setSelectedCards([]);
    setMatches(0);
    setAttempts(0);
    setGameComplete(false);
    setTimer(0);
    setIsTimerRunning(true);
  };

  const getCardStyle = (card: MatchCard) => {
    const isSelected = selectedCards.find(c => c.id === card.id);
    
    if (card.isMatched) {
      return {
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        border: "2px solid #22c55e",
        color: "#22c55e",
        opacity: 0.6,
      };
    }

    if (isSelected) {
      return {
        backgroundColor: card.type === "term" 
          ? "rgba(26, 115, 232, 0.3)" 
          : "rgba(52, 168, 83, 0.3)",
        border: `2px solid ${card.type === "term" ? "#1a73e8" : "#34a853"}`,
        color: isDarkMode ? "#ffffff" : "#000000",
        transform: "scale(1.05)",
      };
    }

    return {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)",
      border: `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
      color: isDarkMode ? "#ffffff" : "#000000",
    };
  };

  if (gameComplete) {
    const accuracy = Math.round((matches / attempts) * 100);

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
            <div className="text-6xl mb-4">�</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
              Game Complete!
            </h2>
            <p className="text-sm md:text-base mb-6" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              All pairs matched!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: "rgba(26, 115, 232, 0.15)" }}
              >
                <p className="text-xl md:text-2xl font-bold" style={{ color: "#1a73e8" }}>
                  {formatTime(timer)}
                </p>
                <p className="text-xs md:text-sm mt-1" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  Time
                </p>
              </div>

              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
              >
                <p className="text-xl md:text-2xl font-bold" style={{ color: "#22c55e" }}>
                  {matches}
                </p>
                <p className="text-xs md:text-sm mt-1" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  Matches
                </p>
              </div>

              <div 
                className="p-4 rounded-xl"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
              >
                <p className="text-xl md:text-2xl font-bold" style={{ color: "#000000" }}>
                  {accuracy}%
                </p>
                <p className="text-xs md:text-sm mt-1" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
                  Accuracy
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="px-6 py-3 rounded-xl text-sm md:text-base font-medium transition-all hover:scale-105"
                style={{ 
                  background: "linear-gradient(90deg, #1a73e8 0%, #34a853 100%)",
                  color: "#ffffff"
                }}
              >
                🔄 Play Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl text-sm md:text-base font-medium transition-all hover:scale-105"
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

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
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

          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs md:text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Time</p>
              <p className="text-lg md:text-xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                {formatTime(timer)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Matches</p>
              <p className="text-lg md:text-xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                {matches}/{terms.length}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div 
          className="mb-6 p-4 rounded-xl text-center"
          style={{ 
            backgroundColor: "rgba(168, 85, 247, 0.1)",
            border: "1px solid rgba(168, 85, 247, 0.2)"
          }}
        >
          <p className="text-sm md:text-base font-medium" style={{ color: "#a855f7" }}>
            Match terms with their definitions by clicking pairs
          </p>
        </div>

        {/* Game Grid */}
        <div className={`grid gap-4 ${cards.length <= 16 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : cards.length <= 24 ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'}`}>
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              disabled={card.isMatched || selectedCards.length >= 2}
              className="p-6 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed hover:scale-105 min-h-[120px] flex items-center justify-center text-center"
              style={getCardStyle(card)}
            >
              <span 
                className="text-sm md:text-base"
                dangerouslySetInnerHTML={{ 
                  __html: card.content
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\*(.*?)\*/g, '<i>$1</i>')
                }}
              />
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "rgba(168, 85, 247, 0.3)", border: "2px solid #a855f7" }}
            />
            <span className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
              Terms
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "rgba(236, 72, 153, 0.3)", border: "2px solid #ec4899" }}
            />
            <span className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
              Definitions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.2)", border: "2px solid #22c55e" }}
            />
            <span className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
              Matched
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

