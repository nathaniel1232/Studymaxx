/**
 * Personalization Engine
 * 
 * Converts raw onboarding answers into actionable personalization settings.
 * This engine makes the app feel like it truly "understands" each student.
 */

import {
  OnboardingData,
  PersonalizationProfile,
  GradeLevel,
  CurrentGradeRange,
  TargetGrade,
  Struggle,
  StudyGoal,
  DailyTime,
} from "./onboardingTypes";

// ── Grade Projection Logic ──────────────────────────────────

function getCurrentGradeNumber(grade: CurrentGradeRange | null): number {
  const map: Record<CurrentGradeRange, number> = {
    below_50: 45,
    "50_60": 55,
    "60_70": 65,
    "70_80": 75,
    "80_90": 85,
    "90_plus": 95,
    not_sure: 65, // assume average
  };
  return grade ? map[grade] : 65;
}

function getTargetGradeNumber(target: TargetGrade | null): number {
  const map: Record<TargetGrade, number> = {
    pass: 70,
    B_average: 83,
    A_average: 92,
    top_of_class: 96,
    perfect_score: 99,
  };
  return target ? map[target] : 85;
}

function getGradeLabel(num: number): string {
  if (num >= 93) return "A";
  if (num >= 90) return "A-";
  if (num >= 87) return "B+";
  if (num >= 83) return "B";
  if (num >= 80) return "B-";
  if (num >= 77) return "C+";
  if (num >= 73) return "C";
  if (num >= 70) return "C-";
  if (num >= 67) return "D+";
  if (num >= 60) return "D";
  return "F";
}

function estimateWeeksToTarget(
  currentGrade: number,
  targetGrade: number,
  dailyTime: DailyTime | null,
  struggles: Struggle[]
): number {
  const gap = Math.max(targetGrade - currentGrade, 0);
  if (gap === 0) return 2;

  // Base: ~1 week per 3 grade points
  let weeks = Math.ceil(gap / 3);

  // Time multiplier
  const timeMultiplier: Record<DailyTime, number> = {
    "15_min": 1.8,
    "30_min": 1.4,
    "1_hour": 1.0,
    "2_hours": 0.75,
    "3_plus_hours": 0.6,
  };
  weeks = Math.ceil(weeks * (dailyTime ? timeMultiplier[dailyTime] : 1.2));

  // Struggles add difficulty
  if (struggles.includes("procrastination")) weeks = Math.ceil(weeks * 1.15);
  if (struggles.includes("motivation")) weeks = Math.ceil(weeks * 1.1);

  return Math.max(2, Math.min(weeks, 24)); // clamp 2-24 weeks
}

// ── Difficulty Mapping ──────────────────────────────────────

function computeDifficulty(
  level: GradeLevel | null,
  currentGrade: CurrentGradeRange | null,
  targetGrade: TargetGrade | null
): PersonalizationProfile["difficultyLevel"] {
  const current = getCurrentGradeNumber(currentGrade);
  const target = getTargetGradeNumber(targetGrade);

  // Higher current grade = can handle harder content
  if (level === "grad_school" || level === "professional") return "advanced";
  if (level === "university" && current >= 80) return "hard";
  if (current >= 85 && target >= 90) return "hard";
  if (current < 60) return "easy";
  return "medium";
}

// ── AI Tone Mapping ─────────────────────────────────────────

function computeAITone(
  struggles: Struggle[],
  goal: StudyGoal | null,
  currentGrade: CurrentGradeRange | null
): PersonalizationProfile["aiTone"] {
  // Struggling students need encouragement
  if (
    struggles.includes("motivation") ||
    struggles.includes("procrastination") ||
    currentGrade === "below_50" ||
    currentGrade === "50_60"
  ) {
    return "encouraging";
  }

  // Exam-focused or catch-up students want direct, efficient help
  if (goal === "upcoming_exam" || goal === "catch_up") return "direct";

  // High achievers want detailed explanations
  if (currentGrade === "90_plus" || goal === "get_ahead") return "detailed";

  return "casual";
}

// ── Study Session Length ────────────────────────────────────

function computeSessionLength(dailyTime: DailyTime | null): number {
  const map: Record<DailyTime, number> = {
    "15_min": 15,
    "30_min": 25, // pomodoro
    "1_hour": 50,
    "2_hours": 50, // 2 x 50 with break
    "3_plus_hours": 50, // 3 x 50 with breaks
  };
  return dailyTime ? map[dailyTime] : 25;
}

// ── Recommended Features ────────────────────────────────────

function computeRecommendedFeatures(data: OnboardingData): string[] {
  const features: string[] = [];

  // Everyone gets flashcards
  features.push("flashcards");

  if (data.mainStruggle.includes("math")) {
    features.push("mathmaxx");
  }

  if (data.mainStruggle.includes("memorization")) {
    features.push("flashcards", "spaced_repetition", "match_game");
  }

  if (data.mainStruggle.includes("exams")) {
    features.push("quiz_mode", "practice_tests");
  }

  if (data.mainStruggle.includes("understanding_concepts")) {
    features.push("summarizer", "ai_explanations");
  }

  if (data.mainStruggle.includes("focus") || data.mainStruggle.includes("procrastination")) {
    features.push("study_timer", "daily_goals");
  }

  if (data.studyGoal === "upcoming_exam") {
    features.push("exam_prep", "quiz_mode");
  }

  if (data.studyGoal === "daily_homework") {
    features.push("document_upload", "ai_explanations");
  }

  // Deduplicate
  return [...new Set(features)];
}

// ── Focus Areas (for study plan) ────────────────────────────

function computeFocusAreas(data: OnboardingData): string[] {
  const areas: string[] = [];

  if (data.mainStruggle.includes("memorization")) areas.push("Active recall practice");
  if (data.mainStruggle.includes("understanding_concepts")) areas.push("Concept breakdowns");
  if (data.mainStruggle.includes("math")) areas.push("Step-by-step math solving");
  if (data.mainStruggle.includes("exams")) areas.push("Test-taking strategies");
  if (data.mainStruggle.includes("focus")) areas.push("Focus-optimized sessions");
  if (data.mainStruggle.includes("procrastination")) areas.push("Micro-study habits");
  if (data.mainStruggle.includes("time_management")) areas.push("Efficient study scheduling");
  if (data.mainStruggle.includes("motivation")) areas.push("Progress tracking & streaks");

  if (data.studyGoal === "catch_up") areas.push("Priority catch-up plan");
  if (data.studyGoal === "get_ahead") areas.push("Advanced practice material");

  return areas.length > 0 ? areas : ["Personalized study sessions"];
}

// ── Notification Settings ───────────────────────────────────

function computeNotifications(data: OnboardingData): PersonalizationProfile["notifications"] {
  const hasExamUrgency = data.studyGoal === "upcoming_exam" || data.studyGoal === "catch_up";
  const needsMotivation = data.mainStruggle.includes("motivation") || data.mainStruggle.includes("procrastination");

  return {
    studyReminders: true,
    dailyGoalNudge: needsMotivation || data.dailyTime === "15_min",
    streakMotivation: needsMotivation,
    examCountdown: hasExamUrgency,
    frequency: hasExamUrgency ? "aggressive" : needsMotivation ? "moderate" : "light",
  };
}

// ── Main Engine ─────────────────────────────────────────────

export function buildPersonalizationProfile(data: OnboardingData): PersonalizationProfile {
  const currentNum = getCurrentGradeNumber(data.currentGrade);
  const targetNum = getTargetGradeNumber(data.targetGrade);
  const improvementPercent = Math.max(0, Math.round(((targetNum - currentNum) / currentNum) * 100));
  const weeksToTarget = estimateWeeksToTarget(currentNum, targetNum, data.dailyTime, data.mainStruggle);

  return {
    difficultyLevel: computeDifficulty(data.gradeLevel, data.currentGrade, data.targetGrade),
    aiTone: computeAITone(data.mainStruggle, data.studyGoal, data.currentGrade),
    studySessionLength: computeSessionLength(data.dailyTime),
    recommendedFeatures: computeRecommendedFeatures(data),
    focusAreas: computeFocusAreas(data),
    gradeProjection: {
      currentLabel: getGradeLabel(currentNum),
      targetLabel: getGradeLabel(targetNum),
      improvementPercent,
      weeksToTarget,
    },
    notifications: computeNotifications(data),
  };
}

// ── AI System Prompt Builder ────────────────────────────────

export function buildAIContext(data: OnboardingData, personalization: PersonalizationProfile): string {
  const parts: string[] = [];

  if (data.firstName) {
    parts.push(`Student name: ${data.firstName}`);
  }

  const levelMap: Record<GradeLevel, string> = {
    middle_school: "middle school",
    high_school: "high school",
    university: "university/college",
    grad_school: "graduate school",
    exam_prep: "exam preparation",
    professional: "professional certification",
  };
  if (data.gradeLevel) {
    parts.push(`Education level: ${levelMap[data.gradeLevel]}`);
  }

  parts.push(`Difficulty preference: ${personalization.difficultyLevel}`);

  const toneMap: Record<string, string> = {
    encouraging: "Be warm, encouraging, and supportive. Celebrate small wins. Use positive reinforcement.",
    direct: "Be concise and efficient. Get straight to the point. Focus on what matters most.",
    detailed: "Provide thorough, nuanced explanations. Include extra context and advanced insights.",
    casual: "Be friendly and conversational. Make learning feel natural and accessible.",
  };
  parts.push(`Communication style: ${toneMap[personalization.aiTone]}`);

  if (data.mainStruggle.length > 0) {
    const struggleLabels = data.mainStruggle.map(s => {
      const map: Record<Struggle, string> = {
        focus: "difficulty focusing",
        math: "math challenges",
        procrastination: "procrastination",
        exams: "test anxiety",
        memorization: "memorization difficulty",
        time_management: "time management",
        understanding_concepts: "concept comprehension",
        motivation: "staying motivated",
      };
      return map[s];
    });
    parts.push(`Known struggles: ${struggleLabels.join(", ")}`);
  }

  if (personalization.focusAreas.length > 0) {
    parts.push(`Focus areas: ${personalization.focusAreas.join(", ")}`);
  }

  if (parts.length === 0) return "";

  return `\nSTUDENT PERSONALIZATION:\n- ${parts.join("\n- ")}\n`;
}

// ── Paywall Data Builder ────────────────────────────────────

export function buildPaywallData(data: OnboardingData, profile: PersonalizationProfile) {
  const name = data.firstName || "there";

  // Personalized headline — honest, no false claims
  let headline = `${name}, let's level up your grades`;
  if (data.studyGoal === "upcoming_exam") {
    headline = `${name}, let's crush your next exam`;
  } else if (data.studyGoal === "catch_up") {
    headline = `${name}, time to catch up`;
  } else if (data.targetGrade === "top_of_class" || data.targetGrade === "perfect_score") {
    headline = `${name}, your path to the top starts now`;
  } else if (data.studyGoal === "get_ahead") {
    headline = `${name}, let's get you ahead`;
  }

  // Personalized benefit bullets — only real features
  const bullets: string[] = [];

  if (data.mainStruggle.includes("memorization")) {
    bullets.push("AI flashcards that adapt to what you forget most");
  }
  if (data.mainStruggle.includes("math")) {
    bullets.push("Step-by-step math solver that actually teaches you");
  }
  if (data.mainStruggle.includes("exams")) {
    bullets.push("Auto-generate practice quizzes from your material");
  }
  if (data.mainStruggle.includes("procrastination") || data.mainStruggle.includes("focus")) {
    bullets.push("Turn any PDF, video or lecture into notes in seconds");
  }
  if (data.mainStruggle.includes("understanding_concepts")) {
    bullets.push("AI that breaks concepts down until they click");
  }
  // Always-relevant bullets
  bullets.push("Unlimited study sets from any material");
  if (bullets.length < 4) {
    bullets.push("AI flashcards and quizzes that adapt to your weak spots");
  }
  if (data.examDate) {
    bullets.push("Personalized study plan for your upcoming exam");
  }

  // Honest subheadline based on their actual grade gap
  const currentLabel = profile.gradeProjection.currentLabel;
  const targetLabel = profile.gradeProjection.targetLabel;
  const weeks = profile.gradeProjection.weeksToTarget;
  const subheadline =
    currentLabel === targetLabel
      ? `You're already close to your goal — let's get you there and keep you there.`
      : `Going from ${currentLabel} to ${targetLabel} is achievable. With consistent daily practice, most students see results in ${weeks} weeks.`;

  return {
    headline,
    subheadline,
    bullets: bullets.slice(0, 5),
    currentGrade: currentLabel,
    targetGrade: targetLabel,
    weeksToTarget: weeks,
    improvementPercent: profile.gradeProjection.improvementPercent,
    ctaText: "Get Premium Access",
    urgencyText: "Limited time offer",
  };
}
