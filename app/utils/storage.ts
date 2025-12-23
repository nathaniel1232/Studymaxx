export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  distractors?: string[]; // Optional pre-generated wrong answers for quiz mode
  mastery?: 'weak' | 'medium' | 'strong'; // Mastery level based on self-assessment
  lastReviewed?: string; // ISO date string
}

export interface FlashcardSet {
  id: string;
  name: string;
  flashcards: Flashcard[];
  createdAt: string;
  lastStudied?: string;
  shareId?: string; // Unique ID for sharing
  userId: string; // Anonymous or real user ID
  accountId?: string; // Set when user logs in and claims their anonymous sets
  isShared?: boolean; // Whether this set has been shared
}

// For backwards compatibility
export type SavedFlashcardSet = FlashcardSet;

const STORAGE_KEY = "studymaxx_flashcard_sets";
const USER_ID_KEY = "studymaxx_user_id";
const SHARED_SETS_KEY = "studymaxx_shared_sets";
const USER_AGE_KEY = "studymaxx_user_age";
const ONBOARDING_COMPLETE_KEY = "studymaxx_onboarding_complete";

/**
 * Get or create anonymous user ID
 */
export const getOrCreateUserId = (): string => {
  if (typeof window === "undefined") return "anonymous";
  
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

/**
 * Generate a unique share ID
 */
const generateShareId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const saveFlashcardSet = (name: string, flashcards: Flashcard[]): FlashcardSet => {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available");
  }

  try {
    const savedSets = getSavedFlashcardSets();
    const userId = getOrCreateUserId();
    
    const newSet: FlashcardSet = {
      id: Date.now().toString(),
      name,
      flashcards,
      createdAt: new Date().toISOString(),
      userId,
    };

    savedSets.push(newSet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));
    return newSet;
  } catch (error) {
    console.error("Error saving flashcard set:", error);
    // Return the set anyway so the app doesn't crash
    return {
      id: Date.now().toString(),
      name,
      flashcards,
      createdAt: new Date().toISOString(),
      userId: "anonymous",
    };
  }
};

export const getSavedFlashcardSets = (): FlashcardSet[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const sets = stored ? JSON.parse(stored) : [];
    
    // Migrate old sets without userId
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

export const deleteFlashcardSet = (id: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const savedSets = getSavedFlashcardSets();
    const filtered = savedSets.filter((set) => set.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting flashcard set:", error);
    // Fail silently to prevent crashes
  }
};

export const updateLastStudied = (id: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const savedSets = getSavedFlashcardSets();
    const updated = savedSets.map((set) =>
      set.id === id ? { ...set, lastStudied: new Date().toISOString() } : set
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error updating last studied:", error);
    // Fail silently
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

/**
 * Enable sharing for a flashcard set
 */
export const shareFlashcardSet = (setId: string): { shareId: string; shareUrl: string } | null => {
  if (typeof window === "undefined") return null;

  const savedSets = getSavedFlashcardSets();
  const setIndex = savedSets.findIndex((set) => set.id === setId);
  
  if (setIndex === -1) return null;

  // Generate shareId if it doesn't exist
  if (!savedSets[setIndex].shareId) {
    savedSets[setIndex].shareId = generateShareId();
    savedSets[setIndex].isShared = true;
  }

  // Save to shared sets storage (global share registry)
  const sharedSet = savedSets[setIndex];
  const sharedSets = getSharedSetsRegistry();
  sharedSets[sharedSet.shareId!] = sharedSet;
  localStorage.setItem(SHARED_SETS_KEY, JSON.stringify(sharedSets));

  // Update local sets
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));

  const shareUrl = `${window.location.origin}/share/${sharedSet.shareId}`;
  return { shareId: sharedSet.shareId!, shareUrl };
};

/**
 * Get shared sets registry (simulates server storage)
 */
const getSharedSetsRegistry = (): Record<string, FlashcardSet> => {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem(SHARED_SETS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading shared sets:", error);
    return {};
  }
};

/**
 * Get a flashcard set by share ID
 */
export const getFlashcardSetByShareId = (shareId: string): FlashcardSet | null => {
  if (typeof window === "undefined") return null;

  const sharedSets = getSharedSetsRegistry();
  return sharedSets[shareId] || null;
};

/**
 * Copy shared set to user's collection
 */
export const copySharedSet = (shareId: string): FlashcardSet | null => {
  if (typeof window === "undefined") return null;

  const sharedSet = getFlashcardSetByShareId(shareId);
  if (!sharedSet) return null;

  const userId = getOrCreateUserId();
  const copiedSet: FlashcardSet = {
    ...sharedSet,
    id: Date.now().toString(),
    name: `${sharedSet.name} (Copy)`,
    createdAt: new Date().toISOString(),
    userId,
    shareId: undefined, // Don't copy the shareId
    isShared: false,
    lastStudied: undefined
  };

  const savedSets = getSavedFlashcardSets();
  savedSets.push(copiedSet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));

  return copiedSet;
};

/**
 * Age & Onboarding utilities
 */
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

/**
 * Migrate anonymous sets to logged-in account
 * Call this after user successfully logs in
 */
export const migrateAnonymousSetsToAccount = (accountId: string): number => {
  if (typeof window === "undefined") return 0;
  
  const savedSets = getSavedFlashcardSets();
  const currentUserId = getOrCreateUserId();
  
  // Find all sets belonging to current anonymous user without an accountId
  const setsToMigrate = savedSets.filter(
    set => set.userId === currentUserId && !set.accountId
  );
  
  // Add accountId to these sets
  const migratedSets = savedSets.map(set => {
    if (set.userId === currentUserId && !set.accountId) {
      return { ...set, accountId };
    }
    return set;
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSets));
  return setsToMigrate.length;
};

/**
 * Check if user has logged-in account
 * Returns accountId if user has claimed their sets, null otherwise
 */
export const getUserAccountId = (): string | null => {
  if (typeof window === "undefined") return null;
  
  const savedSets = getSavedFlashcardSets();
  const currentUserId = getOrCreateUserId();
  
  // Find first set with accountId for current user
  const accountSet = savedSets.find(
    set => set.userId === currentUserId && set.accountId
  );
  
  return accountSet?.accountId || null;
};

/**
 * Get all sets for current user (anonymous or logged-in)
 */
export const getUserFlashcardSets = (): FlashcardSet[] => {
  if (typeof window === "undefined") return [];
  
  const savedSets = getSavedFlashcardSets();
  const currentUserId = getOrCreateUserId();
  
  // Return sets matching current userId
  return savedSets.filter(set => set.userId === currentUserId);
};
