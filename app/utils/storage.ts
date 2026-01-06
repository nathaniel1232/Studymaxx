import { supabase } from './supabase';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  distractors?: string[];
  mastery?: 'weak' | 'medium' | 'strong';
  lastReviewed?: string;
}

export interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface FlashcardSet {
  id: string;
  name: string;
  flashcards: Flashcard[];
  createdAt: string;
  lastStudied?: string;
  shareId?: string;
  userId: string;
  accountId?: string;
  isShared?: boolean;
  subject?: string;
  grade?: string;
  folderId?: string; // New: optional folder assignment
}

export type SavedFlashcardSet = FlashcardSet;

export const STORAGE_KEY = "studymaxx_flashcard_sets";
const USER_ID_KEY = "studymaxx_user_id";
const SHARED_SETS_KEY = "studymaxx_shared_sets";
const USER_AGE_KEY = "studymaxx_user_age";
const ONBOARDING_COMPLETE_KEY = "studymaxx_onboarding_complete";

export const getOrCreateUserId = (): string => {
  if (typeof window === "undefined") return "anonymous";
  
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

const generateShareId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getAuthToken = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const saveFlashcardSet = async (
  name: string, 
  flashcards: Flashcard[], 
  subject?: string, 
  grade?: string
): Promise<FlashcardSet> => {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available");
  }

  const userId = getOrCreateUserId();
  
  try {
    const token = await getAuthToken();
    
    if (token) {
      console.log('[Storage] Attempting to save to Supabase with auth token');
      const response = await fetch('/api/flashcard-sets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, cards: flashcards, subject, grade })
      });

      if (response.ok) {
        const { set } = await response.json();
        console.log('[Storage] Saved to Supabase successfully:', set.id);
        
        return {
          id: set.id,
          name: set.name,
          flashcards: set.cards,
          createdAt: set.created_at,
          lastStudied: set.last_studied,
          userId: set.user_id,
          subject: set.subject,
          grade: set.grade,
          isShared: set.is_shared,
          shareId: set.share_id
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Storage] Supabase save failed:', response.status, errorData);
      }
    } else {
      console.log('[Storage] No auth token - saving to localStorage only');
    }
  } catch (error) {
    console.error('[Storage] Error saving to Supabase:', error);
  }

  try {
    const savedSets = await getSavedFlashcardSets();
    
    const newSet: FlashcardSet = {
      id: Date.now().toString(),
      name,
      flashcards,
      createdAt: new Date().toISOString(),
      userId,
      subject,
      grade
    };

    savedSets.push(newSet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));
    console.log('[Storage] Saved to localStorage:', newSet.id);
    return newSet;
  } catch (error) {
    console.error("Error saving flashcard set:", error);
    return {
      id: Date.now().toString(),
      name,
      flashcards,
      createdAt: new Date().toISOString(),
      userId: "anonymous",
      subject,
      grade
    };
  }
};

export const getSavedFlashcardSets = async (): Promise<FlashcardSet[]> => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const token = await getAuthToken();
    
    if (token) {
      const response = await fetch('/api/flashcard-sets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const { sets } = await response.json();
        console.log('[Storage] Fetched from Supabase:', sets.length, 'sets');
        
        return sets.map((set: any) => ({
          id: set.id,
          name: set.name,
          flashcards: set.cards,
          createdAt: set.created_at,
          lastStudied: set.last_studied,
          userId: set.user_id,
          subject: set.subject,
          grade: set.grade,
          isShared: set.is_shared,
          shareId: set.share_id,
          folderId: set.folder_id // Map folder_id from database
        }));
      }
    }
  } catch (error) {
    console.error('[Storage] Error fetching from Supabase:', error);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const sets = stored ? JSON.parse(stored) : [];
    console.log('[Storage] Fetched from localStorage:', sets.length, 'sets');
    
    const userId = getOrCreateUserId();
    return sets.map((set: any) => ({
      ...set,
      userId: set.userId || userId
    }));
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
};

export const deleteFlashcardSet = async (id: string): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const token = await getAuthToken();
    
    if (token) {
      const response = await fetch(`/api/flashcard-sets?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        console.log('[Storage] Deleted from Supabase:', id);
        return;
      }
    }
  } catch (error) {
    console.error('[Storage] Error deleting from Supabase:', error);
  }

  try {
    const savedSets = await getSavedFlashcardSets();
    const filtered = savedSets.filter((set) => set.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('[Storage] Deleted from localStorage:', id);
  } catch (error) {
    console.error("Error deleting flashcard set:", error);
  }
};

export const updateLastStudied = async (id: string): Promise<void> => {
  if (typeof window === "undefined") return;

  const timestamp = new Date().toISOString();

  try {
    const token = await getAuthToken();
    
    if (token) {
      const response = await fetch('/api/flashcard-sets', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, last_studied: timestamp })
      });

      if (response.ok) {
        console.log('[Storage] Updated in Supabase:', id);
        return;
      }
    }
  } catch (error) {
    console.error('[Storage] Error updating Supabase:', error);
  }

  try {
    const savedSets = await getSavedFlashcardSets();
    const updated = savedSets.map((set) =>
      set.id === id ? { ...set, lastStudied: timestamp } : set
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('[Storage] Updated in localStorage:', id);
  } catch (error) {
    console.error("Error updating last studied:", error);
  }
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const shareFlashcardSet = async (setId: string): Promise<{ shareId: string; shareUrl: string } | null> => {
  if (typeof window === "undefined") return null;

  const savedSets = await getSavedFlashcardSets();
  const setIndex = savedSets.findIndex((set) => set.id === setId);
  
  if (setIndex === -1) return null;

  if (!savedSets[setIndex].shareId) {
    savedSets[setIndex].shareId = generateShareId();
    savedSets[setIndex].isShared = true;
  }

  const sharedSet = savedSets[setIndex];

  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studySet: sharedSet })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));
      return { shareId: data.shareId, shareUrl: data.shareUrl };
    }
  } catch (error) {
    console.error('Failed to share via server:', error);
  }

  const sharedSets = getSharedSetsRegistry();
  sharedSets[sharedSet.shareId!] = sharedSet;
  localStorage.setItem(SHARED_SETS_KEY, JSON.stringify(sharedSets));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));

  const shareUrl = `${window.location.origin}/share/${sharedSet.shareId}`;
  return { shareId: sharedSet.shareId!, shareUrl };
};

const getSharedSetsRegistry = (): Record<string, FlashcardSet> => {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem(SHARED_SETS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
};

export const getFlashcardSetByShareId = async (shareId: string): Promise<FlashcardSet | null> => {
  if (typeof window === "undefined") return null;

  try {
    console.log(`[Storage] Fetching shared set with shareId: ${shareId}`);
    const response = await fetch(`/api/share?shareId=${shareId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Storage] Successfully fetched shared set from server: ${data.studySet?.id}`);
      return data.studySet;
    } else {
      const errorData = await response.json();
      console.warn(`[Storage] Server returned error (${response.status}):`, errorData.error);
    }
  } catch (error) {
    console.error('[Storage] Failed to fetch from server:', error);
  }

  console.log(`[Storage] Falling back to localStorage for shareId: ${shareId}`);
  const sharedSets = getSharedSetsRegistry();
  const result = sharedSets[shareId];
  
  if (!result) {
    console.error(`[Storage] No shared set found in localStorage either for shareId: ${shareId}`);
  }
  
  return result || null;
};

export const copySharedSet = async (shareId: string): Promise<FlashcardSet | null> => {
  if (typeof window === "undefined") return null;

  const sharedSet = await getFlashcardSetByShareId(shareId);
  if (!sharedSet) return null;

  const userId = getOrCreateUserId();
  const copiedSet: FlashcardSet = {
    id: Date.now().toString(),
    name: `${sharedSet.name} (Copy)`,
    flashcards: sharedSet.flashcards,
    createdAt: new Date().toISOString(),
    userId,
    shareId: undefined,
    isShared: false,
    lastStudied: undefined
  };

  const savedSets = await getSavedFlashcardSets();
  savedSets.push(copiedSet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));

  return copiedSet;
};

export const getUserAge = (): number | null => {
  if (typeof window === "undefined") return null;
  const age = localStorage.getItem(USER_AGE_KEY);
  return age ? parseInt(age, 10) : null;
};

export const setUserAge = (age: number): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_AGE_KEY, age.toString());
};

export const hasCompletedOnboarding = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
};

export const setOnboardingComplete = (): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
};

export const migrateAnonymousSetsToAccount = async (accountId: string): Promise<number> => {
  if (typeof window === "undefined") return 0;
  
  const savedSets = await getSavedFlashcardSets();
  const currentUserId = getOrCreateUserId();
  
  const setsToMigrate = savedSets.filter(
    set => set.userId === currentUserId && !set.accountId
  );
  
  const migratedSets = savedSets.map(set => {
    if (set.userId === currentUserId && !set.accountId) {
      return { ...set, accountId };
    }
    return set;
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSets));
  return setsToMigrate.length;
};

export const getUserAccountId = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  
  const savedSets = await getSavedFlashcardSets();
  const currentUserId = getOrCreateUserId();
  
  const accountSet = savedSets.find(
    set => set.userId === currentUserId && set.accountId
  );
  
  return accountSet?.accountId || null;
};

export const getUserFlashcardSets = async (): Promise<FlashcardSet[]> => {
  if (typeof window === "undefined") return [];
  
  const savedSets = await getSavedFlashcardSets();
  const currentUserId = getOrCreateUserId();
  
  return savedSets.filter(set => set.userId === currentUserId);
};

// ==================== FOLDER FUNCTIONS ====================

/**
 * Get all folders for the current user
 * Automatically creates "Unsorted" folder if none exist
 */
export const getFolders = async (): Promise<Folder[]> => {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const response = await fetch('/api/folders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return [];
    
    const { folders } = await response.json();
    return folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      userId: f.user_id,
      createdAt: f.created_at
    }));
  } catch (error) {
    console.error('[Storage] Failed to fetch folders:', error);
    return [];
  }
};

/**
 * Create a new folder
 */
export const createFolder = async (name: string): Promise<{ folder: Folder | null, error: string | null }> => {
  const token = await getAuthToken();
  if (!token) {
    const errorMsg = 'No auth token - user not signed in';
    console.error('[Storage]', errorMsg);
    return { folder: null, error: errorMsg };
  }

  try {
    console.log('[Storage] Creating folder:', name);
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Storage] API error:', response.status, errorData);
      const errorMsg = errorData.details || errorData.error || 'Failed to create folder';
      return { folder: null, error: errorMsg };
    }

    const { folder } = await response.json();
    console.log('[Storage] Folder created:', folder);
    return {
      folder: {
        id: folder.id,
        name: folder.name,
        userId: folder.user_id,
        createdAt: folder.created_at
      },
      error: null
    };
  } catch (error: any) {
    console.error('[Storage] Exception:', error);
    return { folder: null, error: error.message || 'Network error' };
  }
};

/**
 * Delete a folder (flashcards become "Unsorted")
 */
export const deleteFolder = async (folderId: string): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`/api/folders?id=${folderId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return response.ok;
  } catch (error) {
    console.error('[Storage] Failed to delete folder:', error);
    return false;
  }
};

/**
 * Rename a folder
 */
export const renameFolder = async (folderId: string, newName: string): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch('/api/folders', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: folderId, name: newName })
    });

    return response.ok;
  } catch (error) {
    console.error('[Storage] Failed to rename folder:', error);
    return false;
  }
};

/**
 * Move a flashcard set to a different folder
 */
export const moveFlashcardSetToFolder = async (setId: string, folderId: string | null): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) {
    console.error('[Storage] Move failed: No auth token. User may need to sign in again.');
    alert('Session expired. Please sign out and sign back in.');
    return false;
  }

  try {
    console.log('[Storage] Moving flashcard set:', { setId, folderId });
    const response = await fetch('/api/flashcard-sets', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: setId, folder_id: folderId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Storage] Move failed:', response.status, errorData);
      
      if (response.status === 401) {
        alert('Session expired. Please sign out and sign back in.');
      }
      return false;
    }

    console.log('[Storage] Move successful');
    return true;
  } catch (error) {
    console.error('[Storage] Failed to move flashcard set:', error);
    alert('Network error. Please check your connection and try again.');
    return false;
  }
};
