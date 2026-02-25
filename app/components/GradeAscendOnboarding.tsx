"use client";

/**
 * GradeAscendOnboarding — Quick personalisation setup
 *
 * 7 screens: Name → Grade Level → Current Grade (optional) →
 * Target → Struggles → Study Goal → Daily Time → [Paywall]
 *
 * Light mode. CSS-class hover animations. Human copy.
 */

import { useState, useEffect } from "react";
import {
  OnboardingData,
  EMPTY_ONBOARDING,
  GRADE_LEVEL_OPTIONS,
  CURRENT_GRADE_OPTIONS,
  TARGET_GRADE_OPTIONS,
  STRUGGLE_OPTIONS,
  STUDY_GOAL_OPTIONS,
  DAILY_TIME_OPTIONS,
} from "../utils/onboardingTypes";
import { buildPersonalizationProfile, buildPaywallData } from "../utils/personalizationEngine";
import GradeAscendPaywall from "./GradeAscendPaywall";
import LoginModal from "./LoginModal";
import { supabase } from "../utils/supabase";

// ── Shared light-mode palette ─────────────────────────────────

const C = {
  bg: "#f8fafc",
  card: "#ffffff",
  cardActive: "rgba(6,182,212,0.07)",
  border: "#e2e8f0",
  borderActive: "#06b6d4",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#06b6d4",
} as const;

// Tiny checkmark icon
const Check = () => (
  <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.accent }} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

interface GradeAscendOnboardingProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
  onLogin: () => void;
  isPremium?: boolean;
}

export default function GradeAscendOnboarding({
  onComplete,
  onSkip,
  onLogin,
  isPremium = false,
}: GradeAscendOnboardingProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ ...EMPTY_ONBOARDING });
  const [showPaywall, setShowPaywall] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  // When true, after login we go directly to dashboard (handleFinish) instead of paywall
  const [loginForFinish, setLoginForFinish] = useState(false);

  // Exam date step is inserted after Study Goal when studyGoal === 'upcoming_exam'
  const showExamStep = data.studyGoal === 'upcoming_exam';
  const TOTAL_STEPS = showExamStep ? 8 : 7;

  // Map logical step index to step type
  const getStepType = (s: number): string => {
    // Steps: 0=name, 1=grade, 2=currentGrade, 3=target, 4=struggles, 5=studyGoal
    // If showExamStep: 6=examDate, 7=dailyTime
    // Else: 6=dailyTime
    if (s <= 5) return ['name','gradeLevel','currentGrade','targetGrade','struggles','studyGoal'][s];
    if (showExamStep && s === 6) return 'examDate';
    return 'dailyTime';
  };

  // ── Auth tracking ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) { setAuthChecked(true); return; }
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Restore pending state (after Google OAuth redirect or page reload)
  useEffect(() => {
    if (!authChecked) return;
    try {
      const pending = localStorage.getItem('studymaxx_pending_paywall');
      if (pending) {
        const parsed = JSON.parse(pending);
        // Only restore if saved within the last 30 minutes
        if (parsed.data && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setData(parsed.data);
          localStorage.removeItem('studymaxx_pending_paywall');
          if (parsed.forFinish) {
            // User was on "Start Studying Free" flow before OAuth redirect
            if (isLoggedIn) {
              // Already logged in after redirect — finish immediately
              onComplete(parsed.data);
            } else {
              setLoginForFinish(true);
              setShowLoginGate(true);
            }
          } else {
            if (isLoggedIn) {
              setShowPaywall(true);
            } else {
              setShowLoginGate(true);
            }
          }
        } else {
          localStorage.removeItem('studymaxx_pending_paywall');
        }
      }
    } catch (e) {
      localStorage.removeItem('studymaxx_pending_paywall');
    }
  }, [authChecked]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance after login completes (when user came from login gate)
  useEffect(() => {
    if (isLoggedIn && showLoginGate) {
      setShowLoginGate(false);
      if (loginForFinish) {
        setLoginForFinish(false);
        handleFinish();
      } else {
        setShowPaywall(true);
      }
    }
  }, [isLoggedIn, showLoginGate]); // eslint-disable-line react-hooks/exhaustive-deps

  //  Navigation 

  const goNext = () => {
    setStep(prev => {
      if (prev < TOTAL_STEPS - 1) {
        return prev + 1;
      }
      // Last step — trigger analyzing then preview
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowPreview(true);
      }, 2200);
      return prev;
    });
  };

  const handleUnlockFromPreview = () => {
    setShowPreview(false);
    if (!isLoggedIn) {
      // Save state so login flow survives Google OAuth redirect or page reload
      try {
        localStorage.setItem('studymaxx_pending_paywall', JSON.stringify({ data, timestamp: Date.now() }));
      } catch (e) { /* ignore */ }
      setShowLoginGate(true);
    } else {
      setShowPaywall(true);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleFinish = () => onComplete(data);

  //  Validation 

  const canProceed = (): boolean => {
    const stepType = getStepType(step);
    switch (stepType) {
      case 'name': return data.firstName.trim().length >= 1;
      case 'gradeLevel': return data.gradeLevel !== null;
      case 'currentGrade': return true; // optional
      case 'targetGrade': return data.targetGrade !== null;
      case 'struggles': return data.mainStruggle.length >= 1;
      case 'studyGoal': return data.studyGoal !== null;
      case 'examDate': return true; // optional — user can skip
      case 'dailyTime': return data.dailyTime !== null;
      default: return false;
    }
  };

  // ── Step metadata ─────────────────────────────────────────────

  const getStepContent = () => {
    const stepType = getStepType(step);
    const allSteps: Record<string, { title: string; subtitle: string; optional?: boolean }> = {
      name:         { title: "What should we call you?",                          subtitle: "Just your first name is fine." },
      gradeLevel:   { title: "What stage are you in?",                            subtitle: "We'll tune everything to your level." },
      currentGrade: { title: "Honestly, how are your grades right now?",          subtitle: "No judgment — just helps us calibrate.", optional: true },
      targetGrade:  { title: "Where do you want to get to?",                      subtitle: "Pick the result you're actually aiming for." },
      struggles:    { title: "What trips you up the most?",                       subtitle: "Pick everything that applies." },
      studyGoal:    { title: "What are you mainly working on?",                   subtitle: "Pick the one that fits best right now." },
      examDate:     { title: "When's your exam?",                                 subtitle: "We'll build a study plan around this date.", optional: true },
      dailyTime:    { title: "How long can you realistically study each day?",    subtitle: "Be honest — we'll make every minute count." },
    };
    return allSteps[stepType] || allSteps.name;
  };

  const current = getStepContent();

  // ── Analysing overlay ─────────────────────────────────────────

  if (isAnalyzing) {
    return (
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-5 shadow-xl text-center"
          style={{ backgroundColor: C.bg }}
        >
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: "rgba(6,182,212,0.2)" }} />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
          </div>
          <div>
            <p className="text-base font-bold mb-1" style={{ color: C.text }}>Building your profile…</p>
            <p className="text-xs" style={{ color: C.muted }}>Matching features to your answers</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Login gate (shown before paywall if not logged in) ────────────────────

  if (showLoginGate) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10002 }}>
        <LoginModal
          onClose={() => {
            setShowLoginGate(false);
            if (isLoggedIn) {
              if (loginForFinish) {
                setLoginForFinish(false);
                handleFinish();
              } else {
                setShowPaywall(true);
              }
            } else {
              setLoginForFinish(false);
              setShowPreview(true);
            }
            // Clean up pending flag
            try { localStorage.removeItem('studymaxx_pending_paywall'); } catch (e) { /* ignore */ }
          }}
          initialMode="signup"
        />
      </div>
    );
  }

  // ── Preview / personalised results screen ──────────────────────────────────

  if (showPreview) {
    // Pick top 3 features based on struggles — real Studymaxx features only
    const FEATURE_MAP: Record<string, { name: string; desc: string }> = {
      focus:                  { name: "AI Study Assistant",   desc: "Unlimited AI questions on anything you're studying" },
      math:                   { name: "MathMaxx AI Tutor",    desc: "Step-by-step solutions for any math or science problem" },
      procrastination:        { name: "Instant Summaries",    desc: "Turn any lecture, PDF or video into study notes in seconds" },
      exams:                  { name: "Quiz Generator",       desc: "Auto-generate practice quizzes from your material" },
      memorization:           { name: "Smart Flashcards",     desc: "AI-generated flashcards with spaced repetition" },
      time_management:        { name: "Smart Flashcards",     desc: "AI-generated cards that adapt to what you struggle with" },
      understanding_concepts: { name: "AI Explainer",         desc: "Get any concept broken down in plain English" },
      motivation:             { name: "Progress Quizzes",     desc: "Test yourself to lock in what you've learned" },
    };
    const defaults = ["memorization", "focus", "procrastination"];
    const struggles = data.mainStruggle.length > 0 ? data.mainStruggle : defaults;
    const topFeatures = [...struggles, ...defaults]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3)
      .map(s => FEATURE_MAP[s] ?? FEATURE_MAP["focus"]);

    const gradeLabel = (v: string | null) => {
      const map: Record<string, string> = {
        below_50: "<50%", "50_60": "~55%", "60_70": "~65%", "70_80": "~75%",
        "80_90": "~85%", "90_plus": "90%+", not_sure: "?",
      };
      return v ? (map[v] ?? "?") : "?";
    };
    const targetLabel = (v: string | null) => {
      const map: Record<string, string> = {
        pass: "60%+", B_average: "80%+", A_average: "90%+",
        top_of_class: "95%+", perfect_score: "100%",
      };
      return v ? (map[v] ?? "A+") : "A+";
    };

    const firstName = data.firstName.trim() || "you";

    return (
      <>
        <style>{`
          .pw-cta { transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
          .pw-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(6,182,212,0.42) !important; }
          .pw-cta:active { transform: scale(0.98); }
          @keyframes pw-pulse2 {
            0%, 100% { box-shadow: 0 4px 18px rgba(6,182,212,0.3); }
            50%       { box-shadow: 0 4px 26px rgba(6,182,212,0.55); }
          }
          .pw-pulse { animation: pw-pulse2 2.5s ease-in-out infinite; }
        `}</style>
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-xl overflow-y-auto max-h-[92vh] px-5 py-5"
            style={{ backgroundColor: C.bg }}
          >
            {/* Header — clean, no big emoji */}
            <div className="text-center mb-4">
              <h1 className="text-[19px] font-black leading-snug" style={{ color: C.text }}>
                Nice work, {firstName}
              </h1>
              <p className="text-xs mt-1" style={{ color: C.muted }}>
                Here&apos;s what we recommend based on your answers.
              </p>
            </div>

            {/* Grade gap card */}
            {(data.currentGrade || data.targetGrade) && (
              <div
                className="rounded-xl p-3 mb-4 flex items-center justify-between"
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="text-center flex-1">
                  <div
                    className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-base font-black mb-1"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                  >
                    {gradeLabel(data.currentGrade)}
                  </div>
                  <p className="text-[10px]" style={{ color: C.muted }}>Today</p>
                </div>
                <div className="px-3 text-center">
                  <div className="text-lg" style={{ color: C.accent }}>→</div>
                  <p className="text-[9px] font-bold" style={{ color: C.accent }}>your goal</p>
                </div>
                <div className="text-center flex-1">
                  <div
                    className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-base font-black mb-1"
                    style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#22c55e" }}
                  >
                    {targetLabel(data.targetGrade)}
                  </div>
                  <p className="text-[10px]" style={{ color: C.muted }}>Target</p>
                </div>
              </div>
            )}

            {/* Exam date if provided */}
            {data.examDate && (
              <div
                className="rounded-xl px-3 py-2.5 mb-4 flex items-center gap-3"
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(234,179,8,0.1)" }}>
                  <svg className="w-4 h-4" style={{ color: "#ca8a04" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: C.text }}>
                    {data.examSubject || 'Exam'} — {new Date(data.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[11px]" style={{ color: C.muted }}>
                    {Math.max(0, Math.ceil((new Date(data.examDate).getTime() - Date.now()) / 86400000))} days away
                  </p>
                </div>
              </div>
            )}

            {/* Feature cards — clean, no emojis */}
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: C.muted }}>
              Recommended for you
            </p>
            <div className="space-y-2 mb-5">
              {topFeatures.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(6,182,212,0.08)" }}>
                    <Check />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: C.text }}>{feat.name}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof — toned down */}
            <div
              className="rounded-xl px-3 py-2.5 mb-4 text-center"
              style={{ backgroundColor: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}
            >
              <p className="text-xs font-medium" style={{ color: C.accent }}>
                Join 2,000+ students already using Studymaxx
              </p>
            </div>

            {/* CTA — if not logged in, gate behind login first */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  // Persist intent so it survives a Google OAuth page reload
                  try {
                    localStorage.setItem('studymaxx_pending_paywall', JSON.stringify({ data, timestamp: Date.now(), forFinish: true }));
                  } catch (e) { /* ignore */ }
                  setLoginForFinish(true);
                  setShowPreview(false);
                  setShowLoginGate(true);
                } else {
                  handleFinish();
                }
              }}
              className="pw-cta pw-pulse w-full py-3.5 rounded-xl font-bold text-sm text-white mb-2"
              style={{
                background: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 100%)",
                boxShadow: "0 4px 18px rgba(6,182,212,0.3)",
              }}
            >
              Start Studying Free →
            </button>
            <p className="w-full text-center text-xs" style={{ color: C.muted }}>
              No credit card needed · upgrade anytime
            </p>
          </div>
        </div>
      </>
    );
  }

  //  Paywall screen 

  if (showPaywall) {
    const profile = buildPersonalizationProfile(data);
    const paywallData = buildPaywallData(data, profile);
    return (
      <GradeAscendPaywall
        data={data}
        paywallData={paywallData}
        onContinueFree={handleFinish}
        onLogin={onLogin}
        isPremium={isPremium}
      />
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const stepType = getStepType(step);

  // ── Option card style helper ────────────────────────────────
  // Hover effects are driven by CSS class .opt-card (see <style> tag below)

  const optStyle = (selected: boolean) => ({
    backgroundColor: selected ? C.cardActive : C.card,
    border: `1.5px solid ${selected ? C.borderActive : C.border}`,
    borderRadius: "10px",
    cursor: "pointer" as const,
  });

  return (
    <>
      {/* ── Hover / animation CSS ───────────────────────────────── */}
      <style>{`
        .opt-card {
          transition: box-shadow 0.15s ease, border-color 0.15s ease,
                      background-color 0.15s ease, transform 0.12s ease;
        }
        .opt-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.07);
          border-color: #06b6d4 !important;
        }
        .opt-card:active { transform: scale(0.98); }
        .ga-cta-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .ga-cta-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(6,182,212,0.35) !important;
        }
        .ga-cta-btn:not(:disabled):active { transform: scale(0.98); }
        @keyframes ga-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ga-fadein { animation: ga-fadein 0.25s ease-out both; }
      `}</style>

    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
        style={{ backgroundColor: C.bg }}
      >
      {/* ── Header row ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-2"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        {step > 0 ? (
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: C.muted }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* dot indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-400"
              style={{
                width: i === step ? "20px" : "6px",
                height: "6px",
                backgroundColor: i <= step ? C.accent : C.border,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goNext}
            className="text-xs font-medium"
            style={{ color: C.muted }}
          >
            Skip →
          </button>
          <button
            onClick={onSkip}
            className="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full"
            style={{ color: C.muted }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────── */}
      <div className="px-4 pt-2">
        <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#06b6d4,#3b82f6)" }}
          />
        </div>
      </div>

      {/*  Scrollable content area  */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* ── Title (animated per step) ────────────────────────── */}
        <div className="pt-3 pb-2 ga-fadein" key={step}>
          <h1 className="text-[17px] font-bold leading-snug" style={{ color: C.text }}>
            {current.title}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {current.subtitle}
            {current.optional && (
              <> ·{" "}
                <button onClick={goNext} className="underline" style={{ color: C.accent }}>Skip</button>
              </>
            )}
          </p>
        </div>

        {/* ── Step 0: First name ─────────────────────────────── */}
        {stepType === 'name' && (
          <div className="space-y-2 ga-fadein">
            <input
              type="text"
              value={data.firstName}
              onChange={e => setData({ ...data, firstName: e.target.value })}
              onKeyDown={e => e.key === "Enter" && canProceed() && goNext()}
              placeholder="e.g. Alex"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: C.card,
                border: `1.5px solid ${C.border}`,
                color: C.text,
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
            />
            {data.firstName.trim().length >= 1 && (
              <p className="text-xs font-medium" style={{ color: C.accent }}>
                Hey {data.firstName}, let&apos;s get you set up.
              </p>
            )}
          </div>
        )}

        {/* ── Grade level ────────────────────────────────────── */}
        {stepType === 'gradeLevel' && (
          <div className="grid grid-cols-2 gap-2 ga-fadein">
            {GRADE_LEVEL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, gradeLevel: opt.value })}
                className="opt-card p-3 text-left"
                style={optStyle(data.gradeLevel === opt.value)}
              >
                <span className="text-xl block mb-1">{opt.emoji}</span>
                <span className="text-[12px] font-semibold leading-tight block" style={{ color: C.text }}>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Current grade (optional) ──────────────────────── */}
        {stepType === 'currentGrade' && (
          <div className="space-y-1.5 ga-fadein">
            {CURRENT_GRADE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, currentGrade: opt.value })}
                className="opt-card w-full px-3 py-2.5 text-left flex items-center gap-3"
                style={optStyle(data.currentGrade === opt.value)}
              >
                <span className="text-base">{opt.emoji}</span>
                <span className="text-sm font-medium flex-1" style={{ color: C.text }}>{opt.label}</span>
                {data.currentGrade === opt.value && <Check />}
              </button>
            ))}
          </div>
        )}

        {/* ── Target grade ───────────────────────────────────── */}
        {stepType === 'targetGrade' && (
          <div className="space-y-1.5 ga-fadein">
            {TARGET_GRADE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, targetGrade: opt.value })}
                className="opt-card w-full px-3 py-2.5 text-left flex items-center gap-3"
                style={optStyle(data.targetGrade === opt.value)}
              >
                <span className="text-base">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block" style={{ color: C.text }}>{opt.label}</span>
                  {opt.description && <span className="text-[11px]" style={{ color: C.muted }}>{opt.description}</span>}
                </div>
                {data.targetGrade === opt.value && <Check />}
              </button>
            ))}
          </div>
        )}

        {/* ── Struggles (multi-select) ──────────────────────── */}
        {stepType === 'struggles' && (
          <div className="ga-fadein">
            <div className="grid grid-cols-2 gap-2 mb-2">
              {STRUGGLE_OPTIONS.map(opt => {
                const sel = data.mainStruggle.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setData(prev => ({
                        ...prev,
                        mainStruggle: sel
                          ? prev.mainStruggle.filter(s => s !== opt.value)
                          : [...prev.mainStruggle, opt.value],
                      }))
                    }
                    className="opt-card p-3 text-left relative"
                    style={optStyle(sel)}
                  >
                    {sel && (
                      <div
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: C.accent }}
                      >
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <span className="text-lg block mb-1">{opt.emoji}</span>
                    <span className="text-[12px] font-medium leading-tight block" style={{ color: C.text }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {data.mainStruggle.length > 0 && (
              <p className="text-xs font-medium" style={{ color: C.accent }}>
                {data.mainStruggle.length} selected
              </p>
            )}
          </div>
        )}

        {/* ── Study goal ─────────────────────────────────────── */}
        {stepType === 'studyGoal' && (
          <div className="space-y-1.5 ga-fadein">
            {STUDY_GOAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, studyGoal: opt.value })}
                className="opt-card w-full px-3 py-2.5 text-left flex items-center gap-3"
                style={optStyle(data.studyGoal === opt.value)}
              >
                <span className="text-base">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block" style={{ color: C.text }}>{opt.label}</span>
                  {opt.description && <span className="text-[11px]" style={{ color: C.muted }}>{opt.description}</span>}
                </div>
                {data.studyGoal === opt.value && <Check />}
              </button>
            ))}
          </div>
        )}

        {/* ── Exam date (conditional — only when studyGoal=upcoming_exam) ── */}
        {stepType === 'examDate' && (
          <div className="space-y-3 ga-fadein">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>
                Exam date
              </label>
              <input
                type="date"
                value={data.examDate || ''}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setData({ ...data, examDate: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: C.card,
                  border: `1.5px solid ${data.examDate ? C.borderActive : C.border}`,
                  color: C.text,
                  transition: "border-color 0.15s",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>
                Subject / exam name
              </label>
              <input
                type="text"
                value={data.examSubject || ''}
                onChange={e => setData({ ...data, examSubject: e.target.value || null })}
                onKeyDown={e => e.key === "Enter" && canProceed() && goNext()}
                placeholder="e.g. Biology, SAT, Calculus Final"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: C.card,
                  border: `1.5px solid ${data.examSubject ? C.borderActive : C.border}`,
                  color: C.text,
                  transition: "border-color 0.15s",
                }}
              />
            </div>
            {data.examDate && (
              <p className="text-xs font-medium" style={{ color: C.accent }}>
                {(() => {
                  const days = Math.ceil((new Date(data.examDate).getTime() - Date.now()) / 86400000);
                  if (days <= 0) return "That's today — let's cram!";
                  if (days === 1) return "That's tomorrow — we'll make it count.";
                  if (days <= 7) return `${days} days away — tight but doable.`;
                  return `${days} days away — plenty of time to prepare.`;
                })()}
              </p>
            )}
          </div>
        )}

        {/* ── Daily time ─────────────────────────────────────── */}
        {stepType === 'dailyTime' && (
          <div className="space-y-1.5 ga-fadein">
            {DAILY_TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, dailyTime: opt.value })}
                className="opt-card w-full px-3 py-2.5 text-left flex items-center gap-3"
                style={optStyle(data.dailyTime === opt.value)}
              >
                <span className="text-base">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block" style={{ color: C.text }}>{opt.label}</span>
                  {opt.description && <span className="text-[11px]" style={{ color: C.muted }}>{opt.description}</span>}
                </div>
                {data.dailyTime === opt.value && <Check />}
              </button>
            ))}
          </div>
        )}

        {/* ── Continue / finish button ───────────────────────── */}
        <div className="pt-4 space-y-3">
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="ga-cta-btn w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canProceed()
                ? "linear-gradient(135deg,#06b6d4 0%,#3b82f6 100%)"
                : C.border,
              color: canProceed() ? "#ffffff" : C.muted,
              boxShadow: canProceed() ? "0 4px 16px rgba(6,182,212,0.25)" : "none",
            }}
          >
            {stepType === 'dailyTime' ? "Set my preferences →" : "Continue →"}
          </button>

          <p className="text-center text-xs" style={{ color: C.muted }}>
            Already have an account?{" "}
            <button onClick={onLogin} className="font-semibold underline" style={{ color: C.accent }}>
              Log in
            </button>
          </p>
        </div>
      </div>
      </div>
    </div>
    </>
  );
}
