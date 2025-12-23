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
      return "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 dark:from-emerald-500 dark:via-green-600 dark:to-teal-700 shadow-2xl shadow-green-500/60 ring-4 ring-green-300/40";
    }
    if (currentRating === 'ok') {
      return "bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 dark:from-amber-500 dark:via-orange-600 dark:to-yellow-700 shadow-2xl shadow-orange-500/60 ring-4 ring-orange-300/40";
    }
    if (currentRating === 'bad') {
      return "bg-gradient-to-br from-rose-400 via-red-500 to-pink-600 dark:from-rose-500 dark:via-red-600 dark:to-pink-700 shadow-2xl shadow-red-500/60 ring-4 ring-red-300/40";
    }
    // Default colorful gradient - vibrant and eye-catching
    return "bg-gradient-to-br from-blue-400 via-purple-500 to-pink-600 dark:from-blue-500 dark:via-purple-600 dark:to-pink-700 shadow-2xl shadow-purple-500/50";
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

      {/* Self-Rating Buttons - SUPER COLORFUL */}
      {onRate && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'bad');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-110 hover:-translate-y-2 hover:rotate-1 uppercase tracking-wide ${
              currentRating === 'bad' 
                ? 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 text-white shadow-2xl shadow-red-500/70 scale-105 ring-4 ring-red-300/30' 
                : 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-lg hover:shadow-2xl hover:shadow-red-400/60 border-2 border-red-300/50'
            }`}
          >
            {t("bad")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'ok');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-110 hover:-translate-y-2 hover:rotate-1 uppercase tracking-wide ${
              currentRating === 'ok' 
                ? 'bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 text-white shadow-2xl shadow-yellow-500/70 scale-105 ring-4 ring-yellow-300/30' 
                : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg hover:shadow-2xl hover:shadow-yellow-400/60 border-2 border-yellow-300/50'
            }`}
          >
            {t("ok")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'good');
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-110 hover:-translate-y-2 hover:rotate-1 uppercase tracking-wide ${
              currentRating === 'good' 
                ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white shadow-2xl shadow-green-500/70 scale-105 ring-4 ring-green-300/30' 
                : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg hover:shadow-2xl hover:shadow-green-400/60 border-2 border-green-300/50'
            }`}
          >
            {t("good")}
          </button>
        </div>
      )}
    </div>
  );
}
