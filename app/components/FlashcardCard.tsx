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

  // Blue gradient cards with colorful rating states
  const getCardColor = () => {
    if (currentRating === 'good') {
      return "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 dark:from-green-500 dark:via-emerald-600 dark:to-teal-600 shadow-xl shadow-green-500/40";
    }
    if (currentRating === 'ok') {
      return "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 dark:from-yellow-500 dark:via-amber-600 dark:to-orange-600 shadow-xl shadow-yellow-500/40";
    }
    if (currentRating === 'bad') {
      return "bg-gradient-to-br from-red-400 via-rose-500 to-pink-500 dark:from-red-500 dark:via-rose-600 dark:to-pink-600 shadow-xl shadow-red-500/40";
    }
    // Default blue gradient - vibrant and clean
    return "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-700 shadow-xl shadow-blue-500/30";
  };

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className={`mb-6 cursor-pointer transition-all duration-200 ${
        isFlipped ? "" : ""
      }`}
    >
      <div
        className={`relative w-full min-h-[320px] rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${getCardColor()}`}
      >
        {/* Rating Badge */}
        {currentRating && (
          <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-lg text-xs font-semibold ${
            currentRating === 'good' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
            currentRating === 'ok' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
          }`}>
            {currentRating === 'good' ? '😊 ' + t("good") : currentRating === 'ok' ? '😐 ' + t("ok") : '😞 ' + t("bad")}
          </div>
        )}

        {/* Card Content */}
        <div className="text-center max-w-2xl">
          <p className="text-xs font-semibold text-white/80 mb-4 uppercase tracking-wider">
            {isFlipped ? t("answer") : t("question")}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed drop-shadow-lg">
            {isFlipped ? card.answer : card.question}
          </p>
        </div>

        {/* Flip Hint */}
        <div className="absolute bottom-4 text-xs text-white/60 font-medium">
          {isFlipped ? t("click_to_see_question") : t("click_to_reveal")}
        </div>
      </div>

      {/* Rating Buttons - BIG AND CLEAR */}
      {onRate && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔴 BAD clicked for card:', card.id);
              onRate(card.id, 'bad');
            }}
            className={`px-10 py-4 rounded-xl font-bold text-base transition-all duration-200 shadow-lg ${
              currentRating === 'bad' 
                ? 'bg-red-500 text-white scale-110 ring-4 ring-red-300' 
                : 'bg-white/90 text-red-600 hover:bg-red-50 border-2 border-red-300'
            }`}
          >
            😞 {t("bad")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🟡 OK clicked for card:', card.id);
              onRate(card.id, 'ok');
            }}
            className={`px-10 py-4 rounded-xl font-bold text-base transition-all duration-200 shadow-lg ${
              currentRating === 'ok' 
                ? 'bg-yellow-500 text-white scale-110 ring-4 ring-yellow-300' 
                : 'bg-white/90 text-yellow-600 hover:bg-yellow-50 border-2 border-yellow-300'
            }`}
          >
            😐 {t("ok")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🟢 GOOD clicked for card:', card.id);
              onRate(card.id, 'good');
            }}
            className={`px-10 py-4 rounded-xl font-bold text-base transition-all duration-200 shadow-lg ${
              currentRating === 'good' 
                ? 'bg-green-500 text-white scale-110 ring-4 ring-green-300' 
                : 'bg-white/90 text-green-600 hover:bg-green-50 border-2 border-green-300'
            }`}
          >
            😊 {t("good")}
          </button>
        </div>
      )}
    </div>
  );
}
