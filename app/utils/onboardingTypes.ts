// ── Step Data Types ──────────────────────────────────────────

export interface OnboardingData {
  firstName: string;
  gradeLevel: GradeLevel | null;
  currentGrade: CurrentGradeRange | null; // optional
  targetGrade: TargetGrade | null;
  mainStruggle: Struggle[];
  studyGoal: StudyGoal | null;
  examDate: string | null;     // ISO date string, shown when studyGoal === 'upcoming_exam'
  examSubject: string | null;  // e.g. "Biology", shown when studyGoal === 'upcoming_exam'
  dailyTime: DailyTime | null;
}

export type GradeLevel =
  | "middle_school"
  | "high_school"
  | "university"
  | "grad_school"
  | "exam_prep"
  | "professional";

export type CurrentGradeRange =
  | "below_50"
  | "50_60"
  | "60_70"
  | "70_80"
  | "80_90"
  | "90_plus"
  | "not_sure";

export type TargetGrade =
  | "pass"
  | "B_average"
  | "A_average"
  | "top_of_class"
  | "perfect_score";

export type Struggle =
  | "focus"
  | "math"
  | "procrastination"
  | "exams"
  | "memorization"
  | "time_management"
  | "understanding_concepts"
  | "motivation";

export type StudyGoal =
  | "upcoming_exam"
  | "daily_homework"
  | "long_term_improvement"
  | "catch_up"
  | "get_ahead";

export type DailyTime =
  | "15_min"
  | "30_min"
  | "1_hour"
  | "2_hours"
  | "3_plus_hours";

// ── Personalization Profile (derived from onboarding) ────────

export interface PersonalizationProfile {
  difficultyLevel: "easy" | "medium" | "hard" | "advanced";
  aiTone: "encouraging" | "direct" | "detailed" | "casual";
  studySessionLength: number; // minutes
  recommendedFeatures: string[];
  focusAreas: string[];
  gradeProjection: {
    currentLabel: string;
    targetLabel: string;
    improvementPercent: number;
    weeksToTarget: number;
  };
  notifications: {
    studyReminders: boolean;
    dailyGoalNudge: boolean;
    streakMotivation: boolean;
    examCountdown: boolean;
    frequency: "light" | "moderate" | "aggressive";
  };
}

// ── Display constants ────────────────────────────────────────

export const GRADE_LEVEL_OPTIONS: { value: GradeLevel; label: string; emoji: string }[] = [
  { value: "middle_school", label: "Middle School", emoji: "📗" },
  { value: "high_school", label: "High School", emoji: "🎒" },
  { value: "university", label: "University / College", emoji: "🎓" },
  { value: "grad_school", label: "Grad / Masters / PhD", emoji: "🔬" },
  { value: "exam_prep", label: "Exam Prep (SAT, MCAT…)", emoji: "✏️" },
  { value: "professional", label: "Professional Cert", emoji: "🏢" },
];

export const CURRENT_GRADE_OPTIONS: { value: CurrentGradeRange; label: string; emoji: string }[] = [
  { value: "below_50", label: "Below 50% — rough stretch", emoji: "📉" },
  { value: "50_60", label: "50–60% — barely passing", emoji: "😬" },
  { value: "60_70", label: "60–70% — getting by", emoji: "😐" },
  { value: "70_80", label: "70–80% — doing okay", emoji: "👍" },
  { value: "80_90", label: "80–90% — pretty solid", emoji: "💪" },
  { value: "90_plus", label: "90%+ — already strong", emoji: "⚡" },
  { value: "not_sure", label: "Not sure / varies", emoji: "🤔" },
];

export const TARGET_GRADE_OPTIONS: { value: TargetGrade; label: string; emoji: string; description: string }[] = [
  { value: "pass", label: "Pass my classes", emoji: "🏁", description: "Just get over the finish line" },
  { value: "B_average", label: "B average (80%+)", emoji: "📈", description: "Solid, consistent improvement" },
  { value: "A_average", label: "A average (90%+)", emoji: "🎯", description: "Excel consistently" },
  { value: "top_of_class", label: "Top of my class", emoji: "🥇", description: "Outperform everyone" },
  { value: "perfect_score", label: "Perfect scores", emoji: "💎", description: "Nothing less than the best" },
];

export const STRUGGLE_OPTIONS: { value: Struggle; label: string; emoji: string }[] = [
  { value: "focus", label: "Staying focused", emoji: "👁️" },
  { value: "math", label: "Math & calculations", emoji: "📐" },
  { value: "procrastination", label: "Starting at all", emoji: "🛋️" },
  { value: "exams", label: "Test anxiety", emoji: "😬" },
  { value: "memorization", label: "Things not sticking", emoji: "🗂️" },
  { value: "time_management", label: "Time slipping away", emoji: "🗓️" },
  { value: "understanding_concepts", label: "Getting the concept", emoji: "🔍" },
  { value: "motivation", label: "Staying motivated", emoji: "💤" },
];

export const STUDY_GOAL_OPTIONS: { value: StudyGoal; label: string; emoji: string; description: string }[] = [
  { value: "upcoming_exam", label: "Ace an upcoming exam", emoji: "📋", description: "I have a test coming up soon" },
  { value: "daily_homework", label: "Keep up with class", emoji: "📚", description: "Stay on top of daily work" },
  { value: "long_term_improvement", label: "Raise my GPA overall", emoji: "📈", description: "Steady improvement over months" },
  { value: "catch_up", label: "Catch up — I'm behind", emoji: "⏩", description: "Need to recover ground fast" },
  { value: "get_ahead", label: "Get ahead of the class", emoji: "🚀", description: "I want to be the one who already knows it" },
];

export const DAILY_TIME_OPTIONS: { value: DailyTime; label: string; emoji: string; description: string }[] = [
  { value: "15_min", label: "~15 minutes", emoji: "⚡", description: "Tight on time, need efficiency" },
  { value: "30_min", label: "~30 minutes", emoji: "☕", description: "Quick focused session" },
  { value: "1_hour", label: "About an hour", emoji: "⏱️", description: "Good solid session" },
  { value: "2_hours", label: "1–2 hours", emoji: "💪", description: "Serious study block" },
  { value: "3_plus_hours", label: "2+ hours", emoji: "🔋", description: "Full-on study day" },
];

// ── Empty default ────────────────────────────────────────────

export const EMPTY_ONBOARDING: OnboardingData = {
  firstName: "",
  gradeLevel: null,
  currentGrade: null,
  targetGrade: null,
  mainStruggle: [],
  studyGoal: null,
  examDate: null,
  examSubject: null,
  dailyTime: null,
};
