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
 * Calculate the actual current streak from an array of studied dates.
 * Counts consecutive days backwards from today (or yesterday if not studied today).
 */
function computeStreak(studiedDates: string[]): number {
  if (studiedDates.length === 0) return 0;
  
  const sortedDates = [...new Set(studiedDates)].sort().reverse();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  
  // Must have studied today or yesterday to have an active streak
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;
  
  let streak = 0;
  let expectedDate = new Date();
  // If we haven't studied today, start counting from yesterday
  if (sortedDates[0] !== today) {
    expectedDate.setDate(expectedDate.getDate() - 1);
  }
  
  for (const dateStr of sortedDates) {
    const expected = expectedDate.toISOString().split("T")[0];
    if (dateStr === expected) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (dateStr < expected) {
      // Gap found — streak is broken
      break;
    }
    // dateStr > expected means duplicate or future date, skip
  }
  
  return streak;
}

/**
 * Record that the user studied a specific set today.
 * Call this when user opens/interacts with a study set.
 */
export function recordStudySession(setId: string, setName: string): void {
  const data = getStreakData();
  const today = getTodayStr();

  // === Update overall studied dates ===
  if (!data.studiedDates.includes(today)) {
    data.studiedDates.push(today);
    // Keep last 90 days only
    if (data.studiedDates.length > 90) data.studiedDates = data.studiedDates.slice(-90);
  }
  data.lastStudiedDate = today;

  // Recompute overall streak from actual dates
  data.overallStreak = computeStreak(data.studiedDates);
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

  if (!ss.studiedDates.includes(today)) {
    ss.studiedDates.push(today);
    if (ss.studiedDates.length > 90) ss.studiedDates = ss.studiedDates.slice(-90);
  }
  ss.lastStudiedDate = today;

  // Recompute per-set streak from actual dates
  ss.currentStreak = computeStreak(ss.studiedDates);
  ss.longestStreak = Math.max(ss.longestStreak, ss.currentStreak);

  saveStreakData(data);
}

/**
 * Get current streak status for display.
 * Recalculates based on actual studied dates (handles streak breaks correctly).
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

  // Recompute overall streak from actual dates
  const overallStreak = computeStreak(data.studiedDates);
  const studiedToday = data.studiedDates.includes(today);

  // Recalculate per-set streaks
  const activeSetStreaks: SetStreak[] = [];
  const brokenSetStreaks: SetStreak[] = [];

  for (const ss of Object.values(data.setStreaks)) {
    const setStreak = computeStreak(ss.studiedDates);
    if (setStreak > 0) {
      activeSetStreaks.push({
        ...ss,
        currentStreak: setStreak,
      });
    } else if (ss.longestStreak > 1) {
      brokenSetStreaks.push(ss);
    }
  }

  return {
    overallStreak,
    studiedToday,
    longestStreak: Math.max(data.longestOverallStreak, overallStreak),
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
  const atRisk: SetStreak[] = [];

  for (const ss of Object.values(data.setStreaks)) {
    const currentStreak = computeStreak(ss.studiedDates);
    // Has a streak (>= 2 days) via yesterday but not studied today
    if (currentStreak >= 2 && !ss.studiedDates.includes(today)) {
      atRisk.push({ ...ss, currentStreak });
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
