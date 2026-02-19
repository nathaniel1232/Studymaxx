"use client";

import { useState, useEffect } from "react";
import { usePersonalization, StudyLevel } from "../contexts/PersonalizationContext";
import { useSettings } from "../contexts/SettingsContext";

interface WelcomeCardProps {
  userName?: string;
  onDismiss?: () => void;
}

const STUDENT_TYPES = [
  { value: "high_school", label: "High School", icon: "📚" },
  { value: "university", label: "College / University", icon: "🎓" },
  { value: "graduate", label: "Graduate Student", icon: "�" },
  { value: "professional", label: "Professional", icon: "💼" },
];

const POPULAR_SUBJECTS = [
  { value: "math", label: "Math" },
  { value: "science", label: "Science" },
  { value: "biology", label: "Biology" },
  { value: "chemistry", label: "Chemistry" },
  { value: "physics", label: "Physics" },
  { value: "history", label: "History" },
  { value: "english", label: "English" },
  { value: "languages", label: "Languages" },
  { value: "computer_science", label: "CS" },
  { value: "economics", label: "Economics" },
  { value: "psychology", label: "Psychology" },
  { value: "medicine", label: "Medicine" },
  { value: "law", label: "Law" },
  { value: "business", label: "Business" },
];

export default function WelcomeCard({ userName, onDismiss }: WelcomeCardProps) {
  const { profile, completeOnboarding, skipOnboarding } = usePersonalization();
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [step, setStep] = useState(0); // 0 = welcome, 1 = type, 2 = subjects
  const [studentType, setStudentType] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if already completed
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const skipped = localStorage.getItem("studymaxx_onboarding_skipped");
        const saved = localStorage.getItem("studymaxx_onboarding");
        if (skipped === "true" || saved) {
          setDismissed(true);
        }
      } catch (error) {
        console.warn("[WelcomeCard] localStorage not available:", error);
      }
    }
  }, []);

  // Check profile
  useEffect(() => {
    if (profile?.onboarding_completed) {
      setDismissed(true);
    }
  }, [profile?.onboarding_completed]);

  if (dismissed) return null;

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSkip = async () => {
    try {
      localStorage.setItem("studymaxx_onboarding_skipped", "true");
    } catch (error) {
      console.warn("[WelcomeCard] localStorage not available on skip:", error);
    }
    await skipOnboarding();
    setDismissed(true);
    onDismiss?.();
  };

  const handleComplete = async () => {
    setSaving(true);
    const levelMap: Record<string, StudyLevel> = {
      high_school: "high_school",
      university: "university",
      graduate: "university",
      professional: "professional",
    };

    await completeOnboarding({
      subjects: selectedSubjects.length > 0 ? selectedSubjects : ["General"],
      level: levelMap[studentType] || "high_school",
    });
    setSaving(false);
    setDismissed(true);
    onDismiss?.();
  };

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div
      className="rounded-2xl p-6 mb-6 transition-all duration-300"
      style={{ backgroundColor: cardBg, border: cardBorder }}
    >
      {step === 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1" style={{ color: textPrimary }}>
              Welcome{userName ? `, ${userName}` : ''}! 👋
            </h2>
            <p className="text-sm" style={{ color: textSecondary }}>
              Quick question — help us personalize your study experience.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm rounded-lg transition-all duration-200"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Skip
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2 text-sm font-medium rounded-lg text-white transition-all duration-200"
              style={{ backgroundColor: '#1a73e8' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Personalize
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: textPrimary }}>
              What best describes you?
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: '#1a73e8' }} />
              <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {STUDENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setStudentType(type.value)}
                className="p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  backgroundColor: studentType === type.value
                    ? (isDarkMode ? 'rgba(26, 115, 232, 0.15)' : 'rgba(26, 115, 232, 0.08)')
                    : (isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc'),
                  border: studentType === type.value
                    ? '2px solid #1a73e8'
                    : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                  transform: studentType === type.value ? 'scale(1.02)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (studentType !== type.value) {
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (studentType !== type.value) {
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span className="text-lg block mb-1">{type.icon}</span>
                <span className="text-sm font-medium block" style={{ color: textPrimary }}>{type.label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button
              onClick={handleSkip}
              className="text-sm transition-colors"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              Skip
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!studentType}
              className="px-5 py-2 text-sm font-medium rounded-lg text-white transition-all duration-200 disabled:opacity-40"
              style={{ backgroundColor: '#1a73e8' }}
              onMouseEnter={(e) => { if (studentType) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: textPrimary }}>
              What are you studying?
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: '#1a73e8' }} />
              <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: '#1a73e8' }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {POPULAR_SUBJECTS.map((subject) => (
              <button
                key={subject.value}
                onClick={() => toggleSubject(subject.value)}
                className="px-3.5 py-1.5 rounded-full text-sm transition-all duration-200"
                style={{
                  backgroundColor: selectedSubjects.includes(subject.value)
                    ? '#1a73e8'
                    : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                  color: selectedSubjects.includes(subject.value)
                    ? '#ffffff'
                    : textPrimary,
                  border: selectedSubjects.includes(subject.value)
                    ? '1px solid #1a73e8'
                    : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                  fontWeight: selectedSubjects.includes(subject.value) ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!selectedSubjects.includes(subject.value)) {
                    e.currentTarget.style.borderColor = '#1a73e8';
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(26, 115, 232, 0.1)' : 'rgba(26, 115, 232, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedSubjects.includes(subject.value)) {
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
                  }
                }}
              >
                {subject.label}
              </button>
            ))}
          </div>
          {selectedSubjects.length > 0 && (
            <p className="text-xs mb-3" style={{ color: '#1a73e8' }}>
              {selectedSubjects.length} selected
            </p>
          )}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-sm transition-colors"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              ← Back
            </button>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium rounded-lg text-white transition-all duration-200 disabled:opacity-60"
              style={{ backgroundColor: '#1a73e8' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {saving ? 'Saving...' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
