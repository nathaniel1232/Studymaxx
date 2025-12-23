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

  // Modern, clean card colors with smooth transitions
  const getCardColor = () => {
    if (currentRating === 'good') {
      return "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700";
    }
    if (currentRating === 'ok') {
      return "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-yellow-300 dark:border-yellow-700";
    }
    if (currentRating === 'bad') {
      return "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border-2 border-red-300 dark:border-red-700";
    }
    // Default clean white card with subtle shadow
    return "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg";
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
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
            {isFlipped ? t("answer") : t("question")}
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white leading-relaxed">
            {isFlipped ? card.answer : card.question}
          </p>
        </div>

        {/* Flip Hint */}
        <div className="absolute bottom-4 text-xs text-gray-400 dark:text-gray-500 font-medium">
          {isFlipped ? t("click_to_see_question") : t("click_to_reveal")}
        </div>
      </div>

      {/* Clean Rating Buttons with Clear Feedback */}
      {onRate && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'bad');
            }}
            className={`px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              currentRating === 'bad' 
                ? 'bg-red-500 text-white shadow-lg scale-105 ring-2 ring-red-300' 
                : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800'
            }`}
          >
            😞 {t("bad")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'ok');
            }}
            className={`px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              currentRating === 'ok' 
                ? 'bg-yellow-500 text-white shadow-lg scale-105 ring-2 ring-yellow-300' 
                : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            😐 {t("ok")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate(card.id, 'good');
            }}
            className={`px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              currentRating === 'good' 
                ? 'bg-green-500 text-white shadow-lg scale-105 ring-2 ring-green-300' 
                : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800'
            }`}
          >
            😊 {t("good")}
          </button>
        </div>
      )}
    </div>
  );
}
