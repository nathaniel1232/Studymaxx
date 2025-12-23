"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "../utils/storage";
import { useTranslation } from "../contexts/SettingsContext";

interface FlashcardCardProps {
  card: Flashcard;
  isMastered: boolean;
  onRate?: (cardId: string, rating: 'bad' | 'ok' | 'good') => void;
  currentRating?: 'bad' | 'ok' | 'good' | null;
}

export default function FlashcardCard({ card, isMastered, onRate, currentRating }: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const t = useTranslation();

  // Reset flip state whenever the card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [card.id]);

  // Determine card color based on rating with animated highlight
  const getCardColor = () => {
    // Base blue color - always present
    const baseBlue = "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-700";
    
    // Add subtle glow based on rating
    if (currentRating === 'good') {
      return `${baseBlue} shadow-2xl shadow-green-400/60 ring-4 ring-green-400/30`;
    }
    if (currentRating === 'ok') {
      return `${baseBlue} shadow-2xl shadow-yellow-400/60 ring-4 ring-yellow-400/30`;
    }
    if (currentRating === 'bad') {
      return `${baseBlue} shadow-2xl shadow-red-400/60 ring-4 ring-red-400/30`;
    }
    // Default blue with nice shadow
    return `${baseBlue} shadow-xl shadow-blue-500/30`;
  };

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className={`mb-8 cursor-pointer perspective transition-all duration-300 ${
        isFlipped ? "scale-105" : "scale-100"
      }`}
    >
      <div
        className={`relative w-full min-h-[360px] rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-500 transform ${getCardColor()}`}
      >
        {/* Rating Badge - Clean, no emojis */}
        {currentRating && (
          <div className={`absolute top-6 right-6 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg ${
            currentRating === 'good' ? 'bg-white/95 text-green-700 dark:bg-green-100 dark:text-green-900' :
            currentRating === 'ok' ? 'bg-white/95 text-yellow-700 dark:bg-yellow-100 dark:text-yellow-900' :
            'bg-white/95 text-red-700 dark:bg-red-100 dark:text-red-900'
          }`}>
            {currentRating === 'good' ? t("good") : currentRating === 'ok' ? t("ok") : t("bad")}
          </div>
        )}

        {/* Card Content */}
        <div className="text-center max-w-2xl">
          <p className="text-sm font-bold text-white/90 mb-6 uppercase tracking-widest">
            {isFlipped ? t("answer") : t("question")}
          </p>
          <p className="text-3xl md:text-4xl font-bold text-white leading-relaxed">
            {isFlipped ? card.answer : card.question}
          </p>
        </div>

        {/* Flip Hint */}
        <div className="absolute bottom-6 text-sm text-white/80 font-medium">
          {isFlipped ? t("click_to_see_question") : t("click_to_reveal")}
        </div>
      </div>

      {/* Self-Rating Buttons - Colorful and lively */}
      {onRate && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'bad');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 uppercase tracking-wide ${
              currentRating === 'bad' 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-2xl shadow-red-500/50 scale-105' 
                : 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 text-red-700 dark:text-red-300 border-2 border-red-200 dark:border-red-700 hover:border-red-400 hover:shadow-xl hover:shadow-red-300/30'
            }`}
          >
            {t("bad")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'ok');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 uppercase tracking-wide ${
              currentRating === 'ok' 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-2xl shadow-yellow-500/50 scale-105' 
                : 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-800/30 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-200 dark:border-yellow-700 hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-300/30'
            }`}
          >
            {t("ok")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'good');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 uppercase tracking-wide ${
              currentRating === 'good' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-2xl shadow-green-500/50 scale-105' 
                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/30 text-green-700 dark:text-green-300 border-2 border-green-200 dark:border-green-700 hover:border-green-400 hover:shadow-xl hover:shadow-green-300/30'
            }`}
          >
            {t("good")}
          </button>
        </div>
      )}
    </div>
  );
}
