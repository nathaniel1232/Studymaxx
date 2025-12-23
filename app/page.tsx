"use client";

import { useState, useEffect } from "react";
import InputView from "./components/InputView";
import CreateFlowView from "./components/CreateFlowView";
import StudyView from "./components/StudyView";
import SavedSetsView from "./components/SavedSetsView";
import SettingsView from "./components/SettingsView";
import { updateLastStudied, Flashcard, getSavedFlashcardSets, FlashcardSet } from "./utils/storage";
import { getStudyFact } from "./utils/studyFacts";
import { useTranslation, useSettings } from "./contexts/SettingsContext";
import ArrowIcon from "./components/icons/ArrowIcon";

type ViewMode = "home" | "input" | "createFlow" | "studying" | "saved" | "settings";

export default function Home() {
  const t = useTranslation();
  const { settings } = useSettings();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const [currentGrade, setCurrentGrade] = useState<string>("");
  const [savedSets, setSavedSets] = useState<FlashcardSet[]>([]);

  // Load saved sets after hydration
  useEffect(() => {
    setSavedSets(getSavedFlashcardSets());
  }, [viewMode]); // Reload when view changes

  const handleGenerateFlashcards = (cards: Flashcard[], subject?: string, grade?: string) => {
    setFlashcards(cards);
    setCurrentSetId(null);
    if (subject) setCurrentSubject(subject);
    if (grade) setCurrentGrade(grade);
    setViewMode("studying");
  };

  const handleLoadSet = (cards: Flashcard[], setId: string) => {
    setFlashcards(cards);
    setCurrentSetId(setId);
    updateLastStudied(setId);
    setViewMode("studying");
  };

  const handleBackToInput = () => {
    setViewMode("input");
    setFlashcards([]);
    setCurrentSetId(null);
  };

  const handleBackToHome = () => {
    setViewMode("home");
    setFlashcards([]);
    setCurrentSetId(null);
  };

  const handleViewSavedSets = () => {
    setViewMode("saved");
  };

  const handleCreateNew = () => {
    setViewMode("createFlow");
  };

  const handleViewSettings = () => {
    setViewMode("settings");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950">
      {viewMode === "home" && (
        <div className="min-h-screen px-4 py-8 flex flex-col relative overflow-hidden">
          {/* Animated background blobs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
          {/* Header */}
          <header className="max-w-4xl mx-auto w-full pt-8 mb-auto">
            <div className="flex justify-end items-center mb-12">
              {/* Settings Button */}
              <button
                onClick={handleViewSettings}
                className="px-4 py-2 font-medium rounded-full transition-all"
                style={{ 
                  color: 'var(--foreground-muted)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                  e.currentTarget.style.color = 'var(--foreground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--foreground-muted)';
                }}
              >
                {t("settings")}
              </button>
            </div>

            {/* Main Content - Centered */}
            <div className="text-center max-w-2xl mx-auto relative z-10" style={{ marginTop: '15vh' }}>
              <div className="flex items-center justify-center gap-3 mb-6">
                <h1 className="text-brand font-black" style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.3))'
                }}>
                  StudyMaxx
                </h1>
                <span className="px-4 py-2 text-xs font-bold rounded-full shadow-lg" style={{ 
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white'
                }}>
                  BETA
                </span>
              </div>
              
              <p className="text-body-large mb-4" style={{ color: 'var(--foreground)' }}>
                {settings.language === "no" 
                  ? "Gjør notater om til smarte kunnskapskort."
                  : "Turn your notes into smart flashcards."}
              </p>
              
              <p className="text-body mb-12" style={{ color: 'var(--foreground-muted)' }}>
                {settings.language === "no"
                  ? "Last opp notater, PDF-er eller lim inn tekst. Få kunnskapskort og quiz-spørsmål på sekunder."
                  : "Upload notes, PDFs, or paste text. Get flashcards and quiz questions in seconds."}
              </p>
              
              {/* Primary CTA - EPIC BUTTON */}
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center justify-center gap-3 px-12 py-6 text-xl font-black rounded-3xl shadow-2xl transform hover:scale-110 hover:-translate-y-2 transition-all duration-300 mb-8 text-white"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  boxShadow: '0 20px 40px rgba(139, 92, 246, 0.5), 0 0 0 4px rgba(139, 92, 246, 0.2)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)';
                }}
              >
                <span className="drop-shadow-lg">{settings.language === "no" ? "✨ Lag studiesett" : "✨ Create study set"}</span>
                <ArrowIcon size={24} />
              </button>

              {/* Saved sets link */}
              {savedSets.length > 0 && (
                <div>
                  <button
                    onClick={handleViewSavedSets}
                    className="text-body font-medium hover:underline transition-all"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    {settings.language === "no" 
                      ? `Eller se dine ${savedSets.length} lagrede sett`
                      : `Or view your ${savedSets.length} saved ${savedSets.length === 1 ? 'set' : 'sets'}`}
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Footer */}
          <footer className="max-w-4xl mx-auto w-full pb-8 mt-auto">
            <div className="text-center space-y-4">
              <p className="text-body-small" style={{ color: 'var(--foreground-muted)' }}>
                {settings.language === "no" 
                  ? "Beta-versjon · Fungerer på norsk og engelsk"
                  : "Beta version · Works in English and Norwegian"}
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap text-body-small">
                <a 
                  href="mailto:contact@studymaxx.app" 
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  {settings.language === "no" ? "Kontakt" : "Contact"}
                </a>
                <span style={{ color: 'var(--border)' }}>·</span>
                <a 
                  href="/privacy" 
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  {settings.language === "no" ? "Personvern" : "Privacy"}
                </a>
                <span style={{ color: 'var(--border)' }}>·</span>
                <a 
                  href="/terms" 
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  {settings.language === "no" ? "Vilkår" : "Terms"}
                </a>
              </div>
              <p className="text-body-small" style={{ color: 'var(--foreground-muted)', fontSize: '0.75rem' }}>
                © 2025 StudyMaxx
              </p>
            </div>
          </footer>
        </div>
      )}
      
      {viewMode === "input" && (
        <InputView 
          onGenerateFlashcards={handleGenerateFlashcards}
          onViewSavedSets={handleViewSavedSets}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "createFlow" && (
        <CreateFlowView
          onGenerateFlashcards={handleGenerateFlashcards}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "studying" && (
        <StudyView 
          flashcards={flashcards}
          currentSetId={currentSetId}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "saved" && (
        <SavedSetsView 
          onLoadSet={handleLoadSet}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "settings" && (
        <SettingsView 
          onBack={handleBackToHome}
        />
      )}
    </main>
  );
}
