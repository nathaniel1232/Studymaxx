"use client";

import { useState, useEffect } from "react";
import {
  getSavedFlashcardSets,
  deleteFlashcardSet,
  SavedFlashcardSet,
  Flashcard,
} from "../utils/storage";
import { useTranslation } from "../contexts/SettingsContext";
import ArrowIcon from "./icons/ArrowIcon";

interface SavedSetsViewProps {
  onLoadSet: (flashcards: Flashcard[], setId: string) => void;
  onBack: () => void;
}

export default function SavedSetsView({ onLoadSet, onBack }: SavedSetsViewProps) {
  const t = useTranslation();
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);

  useEffect(() => {
    setSavedSets(getSavedFlashcardSets());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm(t("confirm_delete") || "Are you sure you want to delete this flashcard set?")) {
      deleteFlashcardSet(id);
      setSavedSets(getSavedFlashcardSets());
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 flex items-center gap-2"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </button>
          <h1 className="text-page-title text-gray-900 dark:text-white">
            {t("my_sets")}
          </h1>
          <div className="w-20" />
        </div>

        {/* Sets List */}
        {savedSets.length === 0 ? (
          <div className="card-elevated p-12 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div className="text-6xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t("no_saved_sets_yet")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t("create_flashcards_to_start")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {savedSets.map((set) => (
              <div
                key={set.id}
                className="card card-hover p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {set.name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{set.flashcards.length} {t("cards")}</span>
                      {set.lastStudied && (
                        <span>{t("last_studied")} {formatDate(set.lastStudied)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onLoadSet(set.flashcards, set.id)}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all shadow-lg"
                    >
                      {t("study")}
                    </button>
                    <button
                      onClick={() => handleDelete(set.id)}
                      className="px-6 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl transition-all border border-gray-200 dark:border-gray-700"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
