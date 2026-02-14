"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface SubjectPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string) => void;
  title?: string;
  description?: string;
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function SubjectPromptModal({
  isOpen,
  onClose,
  onSubmit,
  title = "What subject is this for?",
  description = "Help us create better study materials by telling us the subject.",
}: SubjectPromptModalProps) {
  const { settings } = useSettings();
  const [subject, setSubject] = useState("");
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (isOpen) {
      setSubject("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim()) {
      onSubmit(subject.trim());
      setSubject("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)"
      }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in-up"
        style={{
          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
          color: isDarkMode ? "#ffffff" : "#000000",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            color: isDarkMode ? "#ffffff" : "#000000",
          }}
        >
          <CloseIcon />
        </button>

        {/* Content */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: '#06b6d4' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <p 
            className="text-sm"
            style={{ color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}
          >
            {description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="subject-input"
              className="block text-sm font-medium mb-2"
              style={{ color: isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)" }}
            >
              Subject Name
            </label>
            <input
              id="subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, History, Biology..."
              autoFocus
              className="w-full px-4 py-3 rounded-lg border-2 outline-none transition-all duration-200 input-text-fix"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.03)",
                borderColor: subject.trim() ? "#1a73e8" : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                color: isDarkMode ? "#ffffff" : "#000000",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!subject.trim()}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: subject.trim() ? '#06b6d4' : "rgba(128,128,128,0.3)",
                color: "#ffffff",
              }}
            >
              Continue
            </button>
          </div>
        </form>

        {/* Quick suggestions */}
        <div className="mt-4">
          <p 
            className="text-xs mb-2"
            style={{ color: isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
          >
            Quick suggestions:
          </p>
          <div className="flex flex-wrap gap-2">
            {["Mathematics", "Science", "History", "English", "Languages"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setSubject(suggestion)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.2)" : "rgba(26, 115, 232, 0.1)",
                  color: "#1a73e8",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
