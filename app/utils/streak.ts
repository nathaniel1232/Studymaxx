/**
 * Study Streak Tracking System
 * 
 * Tracks daily study activity per set and overall.
 * Data persisted in localStorage, synced to Supabase for logged-in users.
 */

const STREAK_KEY = "studymaxx_streaks";
const LAST_STUDY_KEY = "studymaxx_last_study";

export interface SetStreak {
  setId: string;
  setName: string;
  currentStreak: number;
  longestStreak: number;
  lastStudiedDate: string; // YYYY-MM-DD
  studiedDates: string[]; // Array of YYYY-MM-DD dates
}

export interface StreakData {
  overallStreak: number;
  longestOverallStreak: number;
  lastStudiedDate: string | null; // YYYY-MM-DD
  studiedDates: string[]; // Array of YYYY-MM-DD dates  
  setStreaks: Record<string, SetStreak>;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getStreakData(): StreakData {
  if (typeof window === "undefined") {
    return { overallStreak: 0, longestOverallStreak: 0, lastStudiedDate: null, studiedDates: [], setStreaks: {} };
  }
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { overallStreak: 0, longestOverallStreak: 0, lastStudiedDate: null, studiedDates: [], setStreaks: {} };
}

function saveStreakData(data: StreakData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * Record that the user studied a specific set today.
 * Call this when user opens/interacts with a study set.
 */
export function recordStudySession(setId: string, setName: string): void {
  const data = getStreakData();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  // === Update overall streak ===
  if (data.lastStudiedDate !== today) {
    if (data.lastStudiedDate === yesterday) {
      // Consecutive day — extend streak
      data.overallStreak += 1;
    } else if (data.lastStudiedDate === null || data.lastStudiedDate < yesterday) {
      // Streak broken — reset to 1
      data.overallStreak = 1;
    }
    data.lastStudiedDate = today;
    if (!data.studiedDates.includes(today)) {
      data.studiedDates.push(today);
      // Keep last 90 days only
      if (data.studiedDates.length > 90) data.studiedDates = data.studiedDates.slice(-90);
    }
  }
  data.longestOverallStreak = Math.max(data.longestOverallStreak, data.overallStreak);

  // === Update per-set streak ===
  if (!data.setStreaks[setId]) {
    data.setStreaks[setId] = {
      setId,
      setName,
      currentStreak: 0,
      longestStreak: 0,
      lastStudiedDate: "",
      studiedDates: [],
    };
  }

  const ss = data.setStreaks[setId];
  ss.setName = setName; // Update name in case it changed

  if (ss.lastStudiedDate !== today) {
    if (ss.lastStudiedDate === yesterday) {
      ss.currentStreak += 1;
    } else if (!ss.lastStudiedDate || ss.lastStudiedDate < yesterday) {
      ss.currentStreak = 1;
    }
    ss.lastStudiedDate = today;
    if (!ss.studiedDates.includes(today)) {
      ss.studiedDates.push(today);
      if (ss.studiedDates.length > 90) ss.studiedDates = ss.studiedDates.slice(-90);
    }
  }
  ss.longestStreak = Math.max(ss.longestStreak, ss.currentStreak);

  saveStreakData(data);
}

/**
 * Get current streak status for display.
 * Recalculates based on current date (handles streak breaks at midnight).
 */
export function getStreakStatus(): {
  overallStreak: number;
  studiedToday: boolean;
  longestStreak: number;
  setStreaks: SetStreak[];
  brokenSetStreaks: SetStreak[]; // Sets that had a streak but it's now broken
} {
  const data = getStreakData();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  // Recalculate overall streak validity
  let overallStreak = data.overallStreak;
  const studiedToday = data.lastStudiedDate === today;
  
  if (!studiedToday) {
    if (data.lastStudiedDate === yesterday) {
      // Still have their streak — just haven't studied yet today
    } else {
      // Streak is broken
      overallStreak = 0;
    }
  }

  // Recalculate per-set streaks
  const activeSetStreaks: SetStreak[] = [];
  const brokenSetStreaks: SetStreak[] = [];

  for (const ss of Object.values(data.setStreaks)) {
    if (ss.lastStudiedDate === today || ss.lastStudiedDate === yesterday) {
      activeSetStreaks.push({
        ...ss,
        currentStreak: ss.lastStudiedDate === today ? ss.currentStreak : ss.currentStreak,
      });
    } else if (ss.currentStreak > 0 && ss.longestStreak > 1) {
      brokenSetStreaks.push(ss);
    }
  }

  return {
    overallStreak,
    studiedToday,
    longestStreak: data.longestOverallStreak,
    setStreaks: activeSetStreaks,
    brokenSetStreaks,
  };
}

/**
 * Get sets where the user had a streak but hasn't studied today.
 * Used for "Don't break your streak!" notifications.
 */
export function getStreaksAtRisk(): SetStreak[] {
  const data = getStreakData();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const atRisk: SetStreak[] = [];

  for (const ss of Object.values(data.setStreaks)) {
    // Has a streak (>= 2 days), studied yesterday but not today
    if (ss.currentStreak >= 2 && ss.lastStudiedDate === yesterday) {
      atRisk.push(ss);
    }
  }

  return atRisk;
}

/**
 * Get the number of days studied in the last 7 days
 */
export function getWeeklyActivity(): { day: string; studied: boolean }[] {
  const data = getStreakData();
  const result: { day: string; studied: boolean }[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    result.push({
      day: days[d.getDay()],
      studied: data.studiedDates.includes(dateStr),
    });
  }

  return result;
}
