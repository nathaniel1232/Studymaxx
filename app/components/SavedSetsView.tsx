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

  const loadData = async () => {
    const sets = await getSavedFlashcardSets();
    setSavedSets(sets);
    
    const userFolders = await getFolders();
    setFolders(userFolders);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsLoadingFolders(true);
    const result = await createFolder(newFolderName.trim());
    
    if (result) {
      setNewFolderName("");
      setIsCreatingFolder(false);
      await loadData();
    } else {
      alert("Failed to create folder. Please try again or check if you're signed in.");
    }
    setIsLoadingFolders(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm("Delete this folder? Flashcards will be moved to Unsorted.")) {
      await deleteFolder(folderId);
      setSelectedFolder(null);
      await loadData();
    }
  };

  const handleMoveToFolder = async (setId: string, folderId: string | null) => {
    const success = await moveFlashcardSetToFolder(setId, folderId);
    if (success) {
      setMovingSetId(null);
      await loadData();
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

  // Filter sets by selected folder
  const filteredSets = selectedFolder
    ? savedSets.filter(set => set.folderId === selectedFolder)
    : savedSets;

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

        {/* Folder Sidebar */}
        <div className="mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl">📁</span>
                <span>Folders</span>
              </h3>
              <button
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                + New Folder
              </button>
            </div>
            
            {isCreatingFolder && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Folder Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="e.g., Math, Biology, History..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isLoadingFolders}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                  >
                    {isLoadingFolders ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }}
                    className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${
                  selectedFolder === null
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100 font-bold shadow-sm'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>📚 All Sets</span>
                  <span className="text-sm opacity-75">({savedSets.length})</span>
                </div>
              </button>
              
              {folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  <p className="mb-2">No folders yet</p>
                  <p className="text-xs">Create your first folder to organize flashcards!</p>
                </div>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-xl transition-all font-medium ${
                        selectedFolder === folder.id
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100 font-bold shadow-sm'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>📂 {folder.name}</span>
                        <span className="text-sm opacity-75">
                          ({savedSets.filter(s => s.folderId === folder.id).length})
                        </span>
                      </div>
                    </button>
                    {folder.name !== "Unsorted" && (
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title="Delete folder"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sets List */}
        {filteredSets.length === 0 ? (
          <div className="card-elevated p-12 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div className="text-6xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedFolder 
                ? "No sets in this folder yet"
                : t("no_saved_sets_yet")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedFolder
                ? "Create flashcards or move existing sets to this folder."
                : t("create_flashcards_to_start")}
            </p>
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
                      {/* Current folder badge */}
                      {set.folderId && (
                        <span className="px-3 py-1.5 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 rounded-lg text-sm font-semibold border border-teal-200 dark:border-teal-700">
                          📁 {folders.find(f => f.id === set.folderId)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-4 items-center">
                    {/* Move to folder dropdown */}
                    <div className="relative folder-dropdown">
                      <button
                        onClick={() => setMovingSetId(movingSetId === set.id ? null : set.id)}
                        className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-2xl transition-all border-2 border-gray-300 dark:border-gray-600 flex items-center gap-2 shadow-sm hover:shadow-md"
                        title="Move to folder"
                      >
                        📁
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown menu */}
                      {movingSetId === set.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                          <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Move to folder
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {folders.map((folder) => (
                              <button
                                key={folder.id}
                                onClick={() => handleMoveToFolder(set.id, folder.id)}
                                className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  set.folderId === folder.id
                                    ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-semibold'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {folder.name}
                                {set.folderId === folder.id && (
                                  <span className="ml-2 text-teal-600">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => onLoadSet(set.flashcards, set.id)}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-2xl transition-all shadow-lg"
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
          </>
        )}
      </div>
    </div>
  );
}
