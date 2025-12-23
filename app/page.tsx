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
    <main style={{ background: 'var(--background)' }} className="min-h-screen">
      {viewMode === "home" && (
        <div className="min-h-screen px-4 py-8 flex flex-col">
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
            <div className="text-center max-w-2xl mx-auto" style={{ marginTop: '15vh' }}>
              <div className="flex items-center justify-center gap-3 mb-6">
                <h1 className="text-brand" style={{ color: 'var(--foreground)' }}>
                  StudyMaxx
                </h1>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
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
              
              {/* Primary CTA */}
              <button
                onClick={handleCreateNew}
                className="btn btn-primary inline-flex items-center justify-center gap-3 px-10 py-5 text-xl font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200 mb-8"
              >
                <span>{settings.language === "no" ? "Lag studiesett" : "Create study set"}</span>
                <ArrowIcon size={20} />
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
