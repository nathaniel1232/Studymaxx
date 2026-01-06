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
      alert('Failed to move flashcard set. Please make sure you\'re signed in.');
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
                className="px-4 py-2.5 text-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
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
                    className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                  >
                    {isLoadingFolders ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all border-2 border-gray-300 dark:border-gray-600"
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
                        className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-all border border-red-200 dark:border-red-800 font-medium shadow-sm hover:shadow"
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
                style={{ position: 'relative', zIndex: movingSetId === set.id ? 200 : 'auto' }}
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
                        <span className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/50 dark:to-emerald-900/50 text-teal-800 dark:text-teal-200 rounded-lg text-sm font-bold border-2 border-teal-300 dark:border-teal-600 shadow-sm">
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
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-2.5 shadow-lg hover:shadow-xl border-2 border-purple-400 dark:border-purple-500"
                        title="Move to folder"
                      >
                        <span className="text-lg">📁</span>
                        <span className="text-sm">Move</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown menu */}
                      {movingSetId === set.id && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-3 border-purple-200 dark:border-purple-700 py-3 animate-in fade-in slide-in-from-top-2 duration-200" style={{ zIndex: 999 }}>>
                          <div className="px-4 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide border-b-2 border-purple-100 dark:border-purple-800 mb-2">
                            📁 Move to folder
                          </div>
                          <div className="max-h-64 overflow-y-auto px-2">
                            {folders.map((folder) => (
                              <button
                                key={folder.id}
                                onClick={() => handleMoveToFolder(set.id, folder.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all mb-1 ${
                                  set.folderId === folder.id
                                    ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-900 dark:text-purple-100 border-2 border-purple-300 dark:border-purple-600 shadow-sm'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <span>📂</span>
                                    <span>{folder.name}</span>
                                  </span>
                                  {set.folderId === folder.id && (
                                    <span className="text-purple-600 dark:text-purple-400 text-lg">✓</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => onLoadSet(set.flashcards, set.id)}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
                    >
                      {t("study")}
                    </button>
                    <button
                      onClick={() => handleDelete(set.id)}
                      className="px-6 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-400 font-semibold rounded-xl transition-all border-2 border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700"
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

      {/* Delete Folder Confirmation Modal */}
      {deletingFolderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setDeletingFolderId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Delete Folder?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This will delete the folder "<strong>{folders.find(f => f.id === deletingFolderId)?.name}</strong>".
                <br />
                Flashcards will be moved to Unsorted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingFolderId(null)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
