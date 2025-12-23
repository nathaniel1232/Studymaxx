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
    if (currentRating === 'good') {
      return "bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 dark:from-green-500 dark:via-green-600 dark:to-emerald-700 shadow-2xl shadow-green-500/50 border-4 border-green-300 dark:border-green-600";
    }
    if (currentRating === 'ok') {
      return "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-600 dark:from-yellow-500 dark:via-yellow-600 dark:to-orange-700 shadow-2xl shadow-yellow-500/50 border-4 border-yellow-300 dark:border-yellow-600";
    }
    if (currentRating === 'bad') {
      return "bg-gradient-to-br from-red-400 via-red-500 to-red-600 dark:from-red-500 dark:via-red-600 dark:to-red-700 shadow-2xl shadow-red-500/50 border-4 border-red-300 dark:border-red-600";
    }
    // Default blue learning color (always visible, not white)
    return "bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-600 dark:from-blue-500 dark:via-blue-600 dark:to-cyan-700 shadow-xl";
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

      {/* Self-Rating Buttons - Clean, no emojis */}
      {onRate && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'bad');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl uppercase tracking-wide ${
              currentRating === 'bad' 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-2xl shadow-red-500/50' 
                : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-700 hover:border-red-500 shadow-lg'
            }`}
          >
            {t("bad")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'ok');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl uppercase tracking-wide ${
              currentRating === 'ok' 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-2xl shadow-yellow-500/50' 
                : 'bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-500 border-2 border-yellow-300 dark:border-yellow-700 hover:border-yellow-500 shadow-lg'
            }`}
          >
            {t("ok")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'good');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl uppercase tracking-wide ${
              currentRating === 'good' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-2xl shadow-green-500/50' 
                : 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-2 border-green-300 dark:border-green-700 hover:border-green-500 shadow-lg'
            }`}
          >
            {t("good")}
          </button>
        </div>
      )}
    </div>
  );
}
