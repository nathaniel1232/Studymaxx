/**
 * Settings storage and management
 * Stores user preferences locally
 */

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "no";
export type UIScale = "small" | "default" | "large";
export type GradeSystem = "A-F" | "1-6" | "percentage";

export interface AppSettings {
  theme: Theme;
  language: Language;
  uiScale: UIScale;
  gradeSystem: GradeSystem;
}

const SETTINGS_KEY = "studymaxx-settings";

// In-memory fallback for Safari private mode
let memoryStore: AppSettings = { ...defaultSettings };
let isStorageAvailable = true;

// Test if localStorage is available (Safari private mode blocks it)
function testStorageAvailable(): boolean {
  try {
    const test = "__test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.warn("[Storage] localStorage is not available - using memory fallback", e);
    return false;
  }
}

// Check storage availability once at startup
if (typeof window !== "undefined") {
  isStorageAvailable = testStorageAvailable();
}

/**
 * Load settings from localStorage or memory
 */
export function getSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  
  try {
    if (!isStorageAvailable) {
      return memoryStore;
    }
    
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    
    const parsed = JSON.parse(stored);
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return defaultSettings;
  }
}

/**
 * Save settings to localStorage or memory
 */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  
  // Always update memory store as fallback
  memoryStore = settings;
  
  try {
    if (!isStorageAvailable) {
      console.log("[Storage] Using memory fallback for settings");
      return;
    }
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
    applyUIScale(settings.uiScale);
  } catch (error) {
    console.error("Failed to save settings:", error);
    // Fallback to memory store succeeded above
  }
}

/**
 * Update a specific setting
 */
export function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): AppSettings {
  const settings = getSettings();
  const updated = { ...settings, [key]: value };
  saveSettings(updated);
  return updated;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  
  const root = document.documentElement;
  
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

/**
 * Apply UI scale to document
 */
export function applyUIScale(scale: UIScale): void {
  if (typeof window === "undefined") return;
  
  const root = document.documentElement;
  
  // Remove existing scale classes
  root.classList.remove("ui-small", "ui-large");
  
  // Add new scale class
  if (scale === "small") {
    root.classList.add("ui-small");
  } else if (scale === "large") {
    root.classList.add("ui-large");
  }
}

/**
 * Initialize settings on app load
 */
export function initializeSettings(): void {
  const settings = getSettings();
  applyTheme(settings.theme);
  applyUIScale(settings.uiScale);
  
  // Listen for system theme changes
  if (settings.theme === "system" && typeof window !== "undefined") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      document.documentElement.classList.toggle("dark", e.matches);
    });
  }
}

/**
 * Convert grade system values
 */
export function convertGrade(value: string, from: GradeSystem, to: GradeSystem): string {
  // A-F to 1-6 mapping (Norwegian system)
  const afTo16: Record<string, string> = {
    "A": "6", "B": "5", "C": "4", "D": "3", "E": "2", "F": "1"
  };
  
  const _16ToAf: Record<string, string> = {
    "6": "A", "5": "B", "4": "C", "3": "D", "2": "E", "1": "F"
  };
  
  const afToPercent: Record<string, string> = {
    "A": "90-100%", "B": "80-89%", "C": "70-79%", "D": "60-69%", "E": "50-59%", "F": "0-49%"
  };
  
  if (from === to) return value;
  
  if (from === "A-F" && to === "1-6") return afTo16[value] || value;
  if (from === "1-6" && to === "A-F") return _16ToAf[value] || value;
  if (from === "A-F" && to === "percentage") return afToPercent[value] || value;
  
  return value;
}

/**
 * Get translated text based on language setting
 */
export function t(key: string, language: Language): string {
  const translations: Record<string, Record<Language, string>> = {
    "home": { en: "Home", no: "Hjem" },
    "create_new": { en: "Create new", no: "Lag ny" },
    "my_sets": { en: "My Sets", no: "Mine sett" },
    "settings": { en: "Settings", no: "Innstillinger" },
    "subject": { en: "Subject", no: "Fag" },
    "grade": { en: "Grade", no: "Karakter" },
    "study": { en: "Study", no: "Studer" },
    "test_yourself": { en: "Test Yourself", no: "Test deg selv" },
    "flashcards": { en: "Flashcards", no: "Kunnskapskort" },
    "back": { en: "Back", no: "Tilbake" },
    "continue": { en: "Continue", no: "Fortsett" },
    "loading": { en: "Loading...", no: "Laster..." }
  };
  
  return translations[key]?.[language] || key;
}
