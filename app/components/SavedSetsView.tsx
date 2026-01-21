"use client";

import { useState, useEffect } from "react";
import {
  getSavedFlashcardSets,
  deleteFlashcardSet,
  SavedFlashcardSet,
  Flashcard,
  getFolders,
  createFolder,
  deleteFolder,
  moveFlashcardSetToFolder,
  Folder,
} from "../utils/storage";
import { useTranslation } from "../contexts/SettingsContext";
import ArrowIcon from "./icons/ArrowIcon";
import StudyFactBadge from "./StudyFactBadge";

interface SavedSetsViewProps {
  onLoadSet: (flashcards: Flashcard[], setId: string) => void;
  onBack: () => void;
}

export default function SavedSetsView({ onLoadSet, onBack }: SavedSetsViewProps) {
  const t = useTranslation();
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingSetId, setMovingSetId] = useState<string | null>(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const sets = await getSavedFlashcardSets();
      setSavedSets(sets);
      
      const userFolders = await getFolders();
      setFolders(userFolders);
    } catch (error) {
      console.error('[SavedSetsView] ❌ Failed to load data:', error);
      // Show error to user - they need to know sync is broken
      alert('Failed to load your study sets. Please check your internet connection and try again.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.folder-dropdown')) {
        setMovingSetId(null);
      }
    };

    if (movingSetId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [movingSetId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsLoadingFolders(true);
    const { folder, error } = await createFolder(newFolderName.trim());
    
    if (folder) {
      console.log('[SavedSetsView] Folder created, reloading data...');
      setNewFolderName("");
      setIsCreatingFolder(false);
      // Reload data from DB to get true state
      await loadData();
    } else {
      console.error('[SavedSetsView] Folder creation failed:', error);
      alert(`Failed to create folder: ${error || 'Unknown error'}`);
    }
    setIsLoadingFolders(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    setDeletingFolderId(folderId);
  };

  const confirmDeleteFolder = async () => {
    if (!deletingFolderId) return;
    
    const success = await deleteFolder(deletingFolderId);
    if (success) {
      setSelectedFolder(null);
      await loadData();
    } else {
      alert('Failed to delete folder. Please try again.');
    }
    setDeletingFolderId(null);
  };

  const handleMoveToFolder = async (setId: string, folderId: string | null) => {
    console.log('[SavedSetsView] Moving set to folder:', { setId, folderId });
    const success = await moveFlashcardSetToFolder(setId, folderId);
    console.log('[SavedSetsView] Move result:', success);
    
    if (success) {
      setMovingSetId(null);
      await loadData();
    } else {
      alert('Failed to move flashcard set. Please try signing out and back in, or refresh the page.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("confirm_delete") || "Are you sure you want to delete this flashcard set?")) {
      await deleteFlashcardSet(id);
      await loadData();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Show all sets without folder filtering (folders feature temporarily hidden)
  const filteredSets = savedSets;

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      {/* Top bar med logo */}
      <div className="sticky top-0 z-50 px-4 py-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-black text-white">
            StudyMaxx
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold rounded-md hover:from-slate-600 hover:to-slate-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
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
        {filteredSets.length === 0 ? (
          <div className="card-elevated p-16 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {selectedFolder 
                ? "This folder is empty"
                : "No study sets yet"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {selectedFolder
                ? "Create flashcards or move existing sets to get started."
                : "Create your first study set to start learning"}
            </p>
            <button
              onClick={() => {
                // This would go back to create view
                window.location.href = '/';
              }}
              className="btn btn-primary"
            >
              Create First Set
            </button>
          </div>
        ) : (
          <>
            {/* Study fact badge */}
            <div className="mb-6">
              <StudyFactBadge context="spaced-repetition" position="inline" />
            </div>
            
            <div className="grid gap-4">
            {filteredSets.map((set) => (
              <div
                key={set.id}
                className="group relative p-6 bg-slate-800 dark:bg-slate-800/50 hover:bg-slate-700/80 rounded-md transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-violet-400 transition-colors">
                      {set.name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                      <span className="flex items-center gap-1 bg-slate-900/50 px-3 py-1 rounded-full">
                        <span className="text-lg">🎴</span>
                        {set.flashcards.length} {t("cards")}
                      </span>
                      {set.lastStudied && (
                        <span className="flex items-center gap-1 bg-slate-900/50 px-3 py-1 rounded-full">
                          <span className="text-lg">🕒</span>
                          {t("last_studied")} {formatDate(set.lastStudied)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-4 items-center">
                    <button
                      onClick={() => onLoadSet(set.flashcards, set.id)}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-md transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <span className="text-xl">🎓</span>
                      {t("study")}
                    </button>
                    <button
                      onClick={() => handleDelete(set.id)}
                      className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                      title={t("delete")}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Delete Folder Confirmation Modal */}
      {deletingFolderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 px-4" onClick={() => setDeletingFolderId(null)}>
          <div className="bg-slate-900 rounded-md shadow-2xl max-w-md w-full p-8 border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-black text-white mb-2">
                Delete Folder?
              </h3>
              <p className="text-slate-400 font-medium">
                This will delete the folder "<strong>{folders.find(f => f.id === deletingFolderId)?.name}</strong>".
                <br />
                Flashcards will be moved to Unsorted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingFolderId(null)}
                className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-md transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-md transition-all shadow-lg shadow-red-500/20"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
