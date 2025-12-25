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

  // INLINE STYLES for guaranteed visibility - SMOOTH without animation
  const getCardStyle = (): React.CSSProperties => {
    if (currentRating === 'good') {
      return {
        background: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #14b8a6 100%)',
        boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.6), 0 0 60px rgba(16, 185, 129, 0.4)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }
    if (currentRating === 'ok') {
      return {
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #f97316 100%)',
        boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.6), 0 0 60px rgba(245, 158, 11, 0.4)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }
    if (currentRating === 'bad') {
      return {
        background: 'linear-gradient(135deg, #fb7185 0%, #ef4444 50%, #ec4899 100%)',
        boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.4)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }
    // Default LYSENDE BLÅ - SMOOTH
    return {
      background: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 50%, #3b82f6 100%)',
      boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.5)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className={`mb-8 cursor-pointer transition-all duration-300 ${
        isFlipped ? "" : ""
      }`}
    >
      <div
        style={getCardStyle()}
        className="relative w-full min-h-[360px] rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-500"
      >
        {/* Rating Badge */}
        {currentRating && (
          <div className={`absolute top-6 right-6 px-5 py-2 rounded-xl text-sm font-black shadow-lg ${
            currentRating === 'good' ? 'bg-white/90 text-emerald-700 ring-2 ring-emerald-400' :
            currentRating === 'ok' ? 'bg-white/90 text-amber-700 ring-2 ring-amber-400' :
            'bg-white/90 text-rose-700 ring-2 ring-rose-400'
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

      {/* Rating Buttons - PREMIUM DESIGN WITH DETAILS */}
      {onRate && (
        <div className="mt-8 flex items-center justify-center gap-5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔴 BAD clicked for card:', card.id);
              onRate(card.id, 'bad');
            }}
            className={`group relative px-12 py-5 rounded-2xl font-black text-lg transition-all duration-500 ease-out shadow-lg hover:shadow-2xl overflow-hidden ${
              currentRating === 'bad' 
                ? 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 text-white scale-105 shadow-rose-500/40' 
                : 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 hover:bg-gradient-to-br hover:from-rose-50 hover:to-red-50 dark:hover:from-rose-950/30 dark:hover:to-red-950/30 hover:scale-105 hover:-translate-y-1 shadow-rose-200/50 hover:shadow-rose-300/60'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-2xl">😞</span>
              <span>{t("bad")}</span>
            </span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🟡 OK clicked for card:', card.id);
              onRate(card.id, 'ok');
            }}
            className={`group relative px-12 py-5 rounded-2xl font-black text-lg transition-all duration-500 ease-out shadow-lg hover:shadow-2xl overflow-hidden ${
              currentRating === 'ok' 
                ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white scale-105 shadow-amber-500/40' 
                : 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 hover:bg-gradient-to-br hover:from-amber-50 hover:to-yellow-50 dark:hover:from-amber-950/30 dark:hover:to-yellow-950/30 hover:scale-105 hover:-translate-y-1 shadow-amber-200/50 hover:shadow-amber-300/60'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-2xl">😐</span>
              <span>{t("ok")}</span>
            </span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🟢 GOOD clicked for card:', card.id);
              onRate(card.id, 'good');
            }}
            className={`group relative px-12 py-5 rounded-2xl font-black text-lg transition-all duration-500 ease-out shadow-lg hover:shadow-2xl overflow-hidden ${
              currentRating === 'good' 
                ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white scale-105 shadow-emerald-500/40'
                : 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-950/30 dark:hover:to-green-950/30 hover:scale-105 hover:-translate-y-1 shadow-emerald-200/50 hover:shadow-emerald-300/60'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-2xl">😊</span>
              <span>{t("good")}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
