"use client";

import { useEffect, useState } from "react";
import { studyFacts, StudyFact } from "../utils/studyFacts";
import { useSettings } from "../contexts/SettingsContext";

interface StudyFactBadgeProps {
  context?: "general" | "flashcards" | "testing" | "spaced-repetition";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inline";
}

export default function StudyFactBadge({ context, position = "inline" }: StudyFactBadgeProps) {
  const { settings } = useSettings();
  const [fact, setFact] = useState<StudyFact | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Filter facts by context if provided
    const relevantFacts = context 
      ? studyFacts.filter(f => f.context === context || f.context === "general")
      : studyFacts;
    
    // Pick a random fact
    const randomFact = relevantFacts[Math.floor(Math.random() * relevantFacts.length)];
    setFact(randomFact);
  }, [context]);

  if (!fact) return null;

  const positionClasses = {
    "top-left": "fixed top-4 left-4 max-w-xs z-40",
    "top-right": "fixed top-4 right-4 max-w-xs z-40",
    "bottom-left": "fixed bottom-4 left-4 max-w-xs z-40",
    "bottom-right": "fixed bottom-4 right-4 max-w-xs z-40",
    "inline": "relative max-w-full"
  };

  return (
    <div className={`${positionClasses[position]} animate-in fade-in slide-in-from-bottom-2`}>
      <div 
        className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-105"
        style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '2px solid var(--border)',
          backdropFilter: 'blur(10px)',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <div className="text-xs font-bold mb-1 text-indigo-600 dark:text-indigo-400">
              {settings.language === "no" ? "Visste du?" : "Did you know?"}
            </div>
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {fact.text[settings.language]}
            </p>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs italic" style={{ color: 'var(--foreground-muted)' }}>
                  📚 {fact.source[settings.language]}
                </p>
              </div>
            )}
          </div>
          <svg 
            className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
