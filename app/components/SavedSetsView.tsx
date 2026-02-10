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
  renameFolder,
  Folder,
} from "../utils/storage";
import { useTranslation, useSettings } from "../contexts/SettingsContext";
import ArrowIcon from "./icons/ArrowIcon";

interface SavedSetsViewProps {
  onLoadSet: (flashcards: Flashcard[], setId: string) => void;
  onBack: () => void;
}

export default function SavedSetsView({ onLoadSet, onBack }: SavedSetsViewProps) {
  const t = useTranslation();
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [movingSetId, setMovingSetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "cards">("recent");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sets, userFolders] = await Promise.all([
        getSavedFlashcardSets(),
        getFolders()
      ]);
      setSavedSets(sets);
      setFolders(userFolders);
    } catch (error) {
      console.error('[SavedSetsView] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.folder-dropdown') && !target.closest('.move-trigger')) {
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
    
    const { folder, error } = await createFolder(newFolderName.trim());
    
    if (folder) {
      setNewFolderName("");
      setIsCreatingFolder(false);
      await loadData();
    } else {
      alert(`Failed to create folder: ${error || 'Unknown error'}`);
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolderId || !renameFolderName.trim()) return;
    
    const success = await renameFolder(renamingFolderId, renameFolderName.trim());
    if (success) {
      setRenamingFolderId(null);
      setRenameFolderName("");
      await loadData();
    } else {
      alert('Failed to rename folder');
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deletingFolderId) return;
    
    const success = await deleteFolder(deletingFolderId);
    if (success) {
      if (selectedFolder === deletingFolderId) {
        setSelectedFolder(null);
      }
      await loadData();
    } else {
      alert('Failed to delete folder');
    }
    setDeletingFolderId(null);
  };

  const handleMoveToFolder = async (setId: string, folderId: string | null) => {
    const success = await moveFlashcardSetToFolder(setId, folderId);
    if (success) {
      setMovingSetId(null);
      await loadData();
    } else {
      alert('Failed to move set');
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Get the Unsorted folder ID for special handling
  const unsortedFolderId = folders.find(f => f.name === 'Unsorted')?.id || null;

  // Filter and sort sets
  const filteredSets = savedSets
    .filter(set => {
      // Filter by folder
      if (selectedFolder) {
        // "Unsorted" folder should also show sets with no folderId
        if (selectedFolder === unsortedFolderId) {
          if (set.folderId && set.folderId !== selectedFolder) return false;
        } else {
          if (set.folderId !== selectedFolder) return false;
        }
      }
      // Filter by search
      if (searchQuery) {
        return set.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "cards") return b.flashcards.length - a.flashcards.length;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Count sets per folder
  const getSetCountForFolder = (folderId: string | null) => {
    if (!folderId) {
      // Count sets with no folder OR with the Unsorted folder
      return savedSets.filter(s => !s.folderId || s.folderId === unsortedFolderId).length;
    }
    if (folderId === unsortedFolderId) {
      // Unsorted: count sets with no folderId OR explicitly assigned to Unsorted
      return savedSets.filter(s => !s.folderId || s.folderId === folderId).length;
    }
    return savedSets.filter(s => s.folderId === folderId).length;
  };

  return (
    <div className="min-h-screen" style={{ background: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: isDarkMode ? 'rgba(26, 26, 46, 0.9)' : 'rgba(241, 245, 249, 0.95)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}
              >
                <ArrowIcon direction="left" size={20} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-medium" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>My Library</h1>
                <p className="text-xs sm:text-sm hidden sm:block" style={{ color: '#5f6368' }}>
                  {savedSets.length} study {savedSets.length === 1 ? 'set' : 'sets'}
                </p>
              </div>
            </div>
            
            {/* Search & Sort - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search sets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-cyan-500 outline-none"
                  style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, color: isDarkMode ? '#ffffff' : '#000000' }}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 rounded-lg text-sm cursor-pointer outline-none"
                style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, color: isDarkMode ? '#ffffff' : '#000000' }}
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name A-Z</option>
                <option value="cards">Most Cards</option>
              </select>
            </div>
          </div>
          
          {/* Mobile Search */}
          <div className="md:hidden mt-3 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, color: isDarkMode ? '#ffffff' : '#000000' }}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, color: isDarkMode ? '#ffffff' : '#000000' }}
            >
              <option value="recent">Recent</option>
              <option value="name">A-Z</option>
              <option value="cards">Cards</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Folders */}
          <div className="md:w-64 flex-shrink-0">
            <div className="md:sticky md:top-32">
              <div className="rounded-xl p-4" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Folders</h2>
                  <button
                    onClick={() => setIsCreatingFolder(true)}
                    className="p-1.5 rounded-md transition-all hover:scale-110"
                    style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}
                    title="New folder"
                  >
                    <svg className="w-4 h-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Create folder input */}
                {isCreatingFolder && (
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') {
                          setIsCreatingFolder(false);
                          setNewFolderName("");
                        }
                      }}
                      autoFocus
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                      style={{ background: isDarkMode ? '#0a1628' : '#f1f5f9', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, color: isDarkMode ? '#ffffff' : '#000000' }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCreateFolder}
                        className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-md transition-all"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingFolder(false);
                          setNewFolderName("");
                        }}
                        className="px-3 py-1.5 text-sm rounded-md transition-all"
                        style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', color: isDarkMode ? '#ffffff' : '#000000' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Folder list */}
                <div className="space-y-1 max-h-64 md:max-h-none overflow-y-auto">
                  {/* All Sets */}
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedFolder === null ? 'bg-cyan-600 text-white' : ''
                    }`}
                    style={selectedFolder !== null ? { color: isDarkMode ? '#ffffff' : '#000000' } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      All Sets
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === null ? 'bg-white/20' : ''}`} style={selectedFolder !== null ? { background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' } : undefined}>
                      {savedSets.length}
                    </span>
                  </button>

                  {/* User folders */}
                  {folders.filter(f => f.name !== 'Unsorted').map((folder) => (
                    <div key={folder.id} className="group relative">
                      {renamingFolderId === folder.id ? (
                        <div className="px-2 py-1">
                          <input
                            type="text"
                            value={renameFolderName}
                            onChange={(e) => setRenameFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder();
                              if (e.key === 'Escape') {
                                setRenamingFolderId(null);
                                setRenameFolderName("");
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1 text-sm rounded outline-none focus:ring-2 focus:ring-cyan-500"
                            style={{ background: isDarkMode ? '#0a1628' : '#f1f5f9', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, color: isDarkMode ? '#ffffff' : '#000000' }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedFolder(folder.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            selectedFolder === folder.id ? 'bg-cyan-600 text-white' : ''
                          }`}
                          style={selectedFolder !== folder.id ? { color: isDarkMode ? '#ffffff' : '#000000' } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="truncate">{folder.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === folder.id ? 'bg-white/20' : ''}`} style={selectedFolder !== folder.id ? { background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' } : undefined}>
                            {getSetCountForFolder(folder.id)}
                          </span>
                        </button>
                      )}
                      
                      {/* Folder actions on hover */}
                      {selectedFolder === folder.id && renamingFolderId !== folder.id && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFolderId(folder.id);
                              setRenameFolderName(folder.name);
                            }}
                            className="p-1 rounded hover:bg-white/20 opacity-70 hover:opacity-100"
                            title="Rename"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingFolderId(folder.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/30 opacity-70 hover:opacity-100"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Unsorted */}
                  {folders.find(f => f.name === 'Unsorted') && (
                    <button
                      onClick={() => setSelectedFolder(folders.find(f => f.name === 'Unsorted')!.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedFolder === folders.find(f => f.name === 'Unsorted')?.id ? 'bg-cyan-600 text-white' : ''
                      }`}
                      style={selectedFolder !== folders.find(f => f.name === 'Unsorted')?.id ? { color: isDarkMode ? '#9aa0a6' : '#5f6368' } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Unsorted
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === folders.find(f => f.name === 'Unsorted')?.id ? 'bg-white/20' : ''}`} style={selectedFolder !== folders.find(f => f.name === 'Unsorted')?.id ? { background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' } : undefined}>
                        {getSetCountForFolder(folders.find(f => f.name === 'Unsorted')?.id || null)}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main content - Sets grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
              </div>
            ) : filteredSets.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff' }}>
                  <svg className="w-10 h-10" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                  {searchQuery ? "No matching sets" : selectedFolder ? "This folder is empty" : "No study sets yet"}
                </h2>
                <p className="mb-6" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  {searchQuery ? "Try a different search term" : "Create your first study set to get started"}
                </p>
                {!searchQuery && !selectedFolder && (
                  <button
                    onClick={onBack}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-all hover:scale-105"
                  >
                    Create Study Set
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSets.map((set) => (
                  <div
                    key={set.id}
                    className="group relative rounded-xl p-4 sm:p-5 transition-all hover:shadow-lg"
                    style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-2 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg mb-1 truncate" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          {set.name}
                        </h3>
                        <p className="text-xs sm:text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                          {formatDate(set.createdAt)}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Move to folder */}
                        <div className="relative">
                          <button
                            onClick={() => setMovingSetId(movingSetId === set.id ? null : set.id)}
                            className="move-trigger p-2 rounded-lg transition-all opacity-60 hover:opacity-100"
                            style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}
                            title="Move to folder"
                          >
                            <svg className="w-4 h-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </button>
                          
                          {/* Folder dropdown */}
                          {movingSetId === set.id && (
                            <div className="folder-dropdown absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl z-50 py-2" style={{ background: isDarkMode ? '#1e293b' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}` }}>
                              <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                                Move to
                              </div>
                              {folders.map((folder) => (
                                <button
                                  key={folder.id}
                                  onClick={() => handleMoveToFolder(set.id, folder.id)}
                                  className={`w-full text-left px-3 py-2 text-sm transition-all hover:bg-cyan-600/20 ${
                                    set.folderId === folder.id ? 'bg-cyan-600 text-white' : ''
                                  }`}
                                  style={set.folderId !== folder.id ? { color: isDarkMode ? '#ffffff' : '#000000' } : undefined}
                                >
                                  {folder.name}
                                  {set.folderId === folder.id && " ✓"}
                                </button>
                              ))}
                              {set.folderId && (
                                <>
                                  <div className="my-1 border-t" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
                                  <button
                                    onClick={() => handleMoveToFolder(set.id, null)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-cyan-600/20"
                                    style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                                  >
                                    Remove from folder
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(set.id)}
                          className="p-2 rounded-lg transition-all opacity-60 hover:opacity-100 hover:bg-red-500/20"
                          style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}
                          title="Delete"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Card stats */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm" style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
                        <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{set.flashcards.length} cards</span>
                      </div>
                      
                      {set.subject && (
                        <div className="px-2.5 py-1 rounded-full text-xs sm:text-sm" style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                          {set.subject}
                        </div>
                      )}
                    </div>

                    {/* Study button */}
                    <button
                      onClick={() => onLoadSet(set.flashcards, set.id)}
                      className="w-full py-2.5 sm:py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.98]"
                    >
                      Study Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Folder Confirmation Modal */}
      {deletingFolderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setDeletingFolderId(null)}>
          <div className="rounded-xl shadow-2xl max-w-md w-full p-6" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }} onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/10">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                Delete Folder?
              </h3>
              <p style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                "{folders.find(f => f.id === deletingFolderId)?.name}" will be deleted.
                Study sets will be moved to Unsorted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingFolderId(null)}
                className="flex-1 px-4 py-3 font-medium rounded-lg transition-all"
                style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', color: isDarkMode ? '#ffffff' : '#000000' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

