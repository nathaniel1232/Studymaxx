"use client";

import { useState } from "react";

interface GenerationSettings {
  count: number;
  difficulty: "Easy" | "Medium" | "Hard";
  matchPairs: number;
  outputLanguage: string;
}

interface CustomizeGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: GenerationSettings) => void;
  generationType: "flashcards" | "quiz" | "match";
  isGenerating: boolean;
  isPremium?: boolean;
  isDarkMode: boolean;
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Same as input" },
  { value: "en", label: "English" },
  { value: "Norwegian", label: "Norwegian" },
  { value: "Swedish", label: "Swedish" },
  { value: "Danish", label: "Danish" },
  { value: "German", label: "German" },
  { value: "French", label: "French" },
  { value: "Spanish", label: "Spanish" },
  { value: "Italian", label: "Italian" },
  { value: "Dutch", label: "Dutch" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Polish", label: "Polish" },
  { value: "Finnish", label: "Finnish" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Chinese", label: "Chinese" },
  { value: "Arabic", label: "Arabic" },
];

export default function CustomizeGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  generationType,
  isGenerating,
  isPremium = false,
  isDarkMode,
}: CustomizeGenerationModalProps) {
  const [settings, setSettings] = useState<GenerationSettings>({
    count: 15,
    difficulty: "Medium",
    matchPairs: 8,
    outputLanguage: "auto",
  });

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate(settings);
  };

  // Free users get restricted count options
  const countOptions = generationType === "match" 
    ? (isPremium ? [4, 6, 8, 10, 12, 15] : [6, 8])
    : (isPremium ? [10, 15, 20, 25, 30] : [10]);

  const currentCount = generationType === "match" ? settings.matchPairs : settings.count;
  const premiumLimit = generationType === "match" ? 10 : 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: isDarkMode ? "#0f1d32" : "#ffffff",
          border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
        >
          <h3 className="text-lg font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
            {generationType === "flashcards" && "🎴 Generate Flashcards"}
            {generationType === "quiz" && "📝 Generate Quiz"}
            {generationType === "match" && "🎮 Match Game Settings"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              color: isDarkMode ? "#5f6368" : "#5f6368",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Count Selection */}
          <div>
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
            >
              {generationType === "match" ? "Number of Pairs" : "Number of Cards"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {countOptions.map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (generationType === "match") {
                      setSettings(s => ({ ...s, matchPairs: num }));
                    } else {
                      setSettings(s => ({ ...s, count: num }));
                    }
                  }}
                  className="px-3 py-3 rounded-xl font-bold text-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: currentCount === num
                      ? "#1a73e8"
                      : isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: currentCount === num
                      ? "#ffffff"
                      : isDarkMode ? "#ffffff" : "#000000",
                    border: currentCount === num
                      ? "2px solid #1a73e8"
                      : `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
            {!isPremium && currentCount > premiumLimit && (
              <p className="text-xs mt-2 text-amber-500">
                ⭐ Premium required for more than {premiumLimit} {generationType === "match" ? "pairs" : "cards"}
              </p>
            )}
          </div>

          {/* Difficulty Selection */}
          <div>
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
            >
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Easy", "Medium", "Hard"] as const).map((level) => {
                const isLocked = !isPremium && level !== "Medium";
                return (
                  <button
                    key={level}
                    onClick={() => !isLocked && setSettings(s => ({ ...s, difficulty: level }))}
                    disabled={isLocked}
                    className="px-4 py-3 rounded-xl font-medium transition-all relative"
                    style={{
                      backgroundColor: settings.difficulty === level
                        ? level === "Easy" ? "rgba(34, 197, 94, 0.2)"
                          : level === "Medium" ? "rgba(26, 115, 232, 0.2)"
                          : "rgba(239, 68, 68, 0.2)"
                        : isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      color: settings.difficulty === level
                        ? level === "Easy" ? "#22c55e"
                          : level === "Medium" ? "#1a73e8"
                          : "#ef4444"
                        : isDarkMode ? "#ffffff" : "#000000",
                      border: settings.difficulty === level
                        ? `2px solid ${level === "Easy" ? "#22c55e" : level === "Medium" ? "#1a73e8" : "#ef4444"}`
                        : `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                      opacity: isLocked ? 0.5 : 1,
                      cursor: isLocked ? "not-allowed" : "pointer",
                    }}
                  >
                    {level}
                    {isLocked && <span className="ml-1">🔒</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-2" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              {settings.difficulty === "Easy" && "Basic recall questions, shorter answers"}
              {settings.difficulty === "Medium" && "Balanced mix of concepts and details"}
              {settings.difficulty === "Hard" && "Complex concepts, requires deep understanding"}
            </p>
            {!isPremium && (
              <p className="text-xs mt-1 text-amber-500">
                ⭐ Premium required for Easy and Hard difficulty
              </p>
            )}
          </div>

          {/* Output Language */}
          <div>
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
            >
              Output Language {!isPremium && <span className="text-xs text-amber-500">🔒 Premium feature</span>}
            </label>
            <select
              value={settings.outputLanguage}
              onChange={(e) => setSettings(s => ({ ...s, outputLanguage: e.target.value }))}
              disabled={!isPremium}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                color: isDarkMode ? "#ffffff" : "#000000",
                border: `2px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                opacity: !isPremium ? 0.6 : 1,
                cursor: !isPremium ? "not-allowed" : "pointer",
              }}
            >
              {(isPremium ? LANGUAGE_OPTIONS : LANGUAGE_OPTIONS.filter(lang => lang.value === "auto")).map((lang) => (
                <option key={lang.value} value={lang.value} style={{ backgroundColor: isDarkMode ? "#0f1d32" : "#ffffff", color: isDarkMode ? "#ffffff" : "#000000" }}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1.5" style={{ color: isDarkMode ? "#5f6368" : "#5f6368" }}>
              {settings.outputLanguage === "auto" ? "Flashcards will be in the same language as your content" : `Flashcards will be generated in ${LANGUAGE_OPTIONS.find(l => l.value === settings.outputLanguage)?.label}`}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="px-6 py-4 border-t flex gap-3"
          style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              color: isDarkMode ? "#ffffff" : "#000000",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            style={{
              backgroundColor: "#1a73e8",
              color: "#ffffff",
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <SpinnerIcon /> Generating...
              </>
            ) : (
              <>
                ✨ Generate {generationType === "match" 
                  ? `${settings.matchPairs} Pairs` 
                  : `${currentCount} Cards`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { GenerationSettings };

