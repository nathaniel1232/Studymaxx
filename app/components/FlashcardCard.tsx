"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);
  const t = useTranslation();

  // Reset flip state whenever the card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [card.id]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Tilt: max ±12 degrees
    const tiltX = (y - 0.5) * -24;
    const tiltY = (x - 0.5) * 24;
    
    setTilt({ x: tiltX, y: tiltY });
    setGlarePos({ x: x * 100, y: y * 100 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    setGlarePos({ x: 50, y: 50 });
  }, []);

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
      ref={cardRef}
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="mb-6 md:mb-8 cursor-pointer"
      style={{
        perspective: '1000px',
      }}
    >
      <div
        style={{
          ...getCardStyle(),
          transform: isHovering 
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)` 
            : 'rotateX(0) rotateY(0) scale(1)',
          transition: isHovering 
            ? 'transform 0.1s ease-out, box-shadow 0.3s ease, background 0.4s ease' 
            : 'transform 0.5s ease-out, box-shadow 0.4s ease, background 0.4s ease',
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full min-h-[280px] md:min-h-[320px] rounded-md md:rounded-4xl p-8 md:p-12 flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Glare effect on hover */}
        {isHovering && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 rounded-md md:rounded-4xl"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)`,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}
        {/* Rating Badge */}
        {currentRating && (
          <div className={`absolute top-4 md:top-6 right-4 md:right-6 px-4 md:px-5 py-2 rounded-md md:rounded-md text-xs md:text-sm font-black shadow-2xl ${
            currentRating === 'good' ? 'bg-white/95 text-emerald-700 ring-2 ring-emerald-400' :
            currentRating === 'ok' ? 'bg-white/95 text-amber-700 ring-2 ring-amber-400' :
            'bg-white/95 text-rose-700 ring-2 ring-rose-400'
          }`}>
            {currentRating === 'good' ? '😊 ' + t("good") : currentRating === 'ok' ? '😐 ' + t("ok") : '😞 ' + t("bad")}
          </div>
        )}

        {/* Card Content */}
        <div className="text-center max-w-3xl px-2">
          <p className="text-xs font-black text-white/90 mb-3 md:mb-4 uppercase tracking-widest">
            {isFlipped ? t("answer") : t("question")}
          </p>
          <p 
            className="text-base md:text-lg lg:text-xl font-black text-white leading-relaxed drop-shadow-xl"
            dangerouslySetInnerHTML={{ 
              __html: (isFlipped ? card.answer : card.question)
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
                .replace(/\n/g, '<br/>')
            }}
          />
        </div>

        {/* Flip Hint */}
        <div className="absolute bottom-4 md:bottom-6 text-xs md:text-sm text-white/70 font-semibold">
          {isFlipped ? t("click_to_see_question") : t("click_to_reveal")}
        </div>
      </div>

      {/* Rating Buttons - PREMIUM DESIGN WITH DETAILS */}
      {onRate && (
        <div className="mt-6 md:mt-10 flex items-center justify-center gap-3 md:gap-6 flex-wrap px-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔴 BAD clicked for card:', card.id);
              onRate(card.id, 'bad');
            }}
            className={`group relative px-6 md:px-10 py-3 md:py-6 rounded-md md:rounded-md font-bold md:font-black text-sm md:text-xl transition-all duration-500 ease-out shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl overflow-hidden active:scale-95 ${
              currentRating === 'bad' 
                ? 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 text-white scale-105 md:scale-110 shadow-rose-500/50' 
                : 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 hover:bg-gradient-to-br hover:from-rose-50 hover:to-red-50 dark:hover:from-rose-950/30 dark:hover:to-red-950/30 hover:scale-105 md:hover:scale-110 hover:-translate-y-1 md:hover:-translate-y-2 shadow-rose-200/50 hover:shadow-rose-300/60'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <span className="relative z-10 flex items-center gap-2 md:gap-3">
              <span className="text-xl md:text-3xl">😞</span>
              <span className="hidden sm:inline">{t("bad")}</span>
            </span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🟡 OK clicked for card:', card.id);
              onRate(card.id, 'ok');
            }}
            className={`group relative px-6 md:px-10 py-3 md:py-6 rounded-md md:rounded-md font-bold md:font-black text-sm md:text-xl transition-all duration-500 ease-out shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl overflow-hidden active:scale-95 ${
              currentRating === 'ok' 
                ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white scale-105 md:scale-110 shadow-amber-500/50' 
                : 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 hover:bg-gradient-to-br hover:from-amber-50 hover:to-yellow-50 dark:hover:from-amber-950/30 dark:hover:to-yellow-950/30 hover:scale-105 md:hover:scale-110 hover:-translate-y-1 md:hover:-translate-y-2 shadow-amber-200/50 hover:shadow-amber-300/60'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <span className="relative z-10 flex items-center gap-2 md:gap-3">
              <span className="text-xl md:text-3xl">😐</span>
              <span className="hidden sm:inline">{t("ok")}</span>
            </span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🟢 GOOD clicked for card:', card.id);
              onRate(card.id, 'good');
            }}
            className={`group relative px-6 md:px-10 py-3 md:py-6 rounded-md md:rounded-md font-bold md:font-black text-sm md:text-xl transition-all duration-500 ease-out shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl overflow-hidden active:scale-95 ${
              currentRating === 'good' 
                ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white scale-105 md:scale-110 shadow-emerald-500/50'
                : 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-950/30 dark:hover:to-green-950/30 hover:scale-105 md:hover:scale-110 hover:-translate-y-1 md:hover:-translate-y-2 shadow-emerald-200/50 hover:shadow-emerald-300/60'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <span className="relative z-10 flex items-center gap-2 md:gap-3">
              <span className="text-xl md:text-3xl">😊</span>
              <span className="hidden sm:inline">{t("good")}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

