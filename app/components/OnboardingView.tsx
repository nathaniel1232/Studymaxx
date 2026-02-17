"use client";

import { useState } from "react";
import { usePersonalization, StudyLevel } from "../contexts/PersonalizationContext";
import { useSettings, Language } from "../contexts/SettingsContext";

interface OnboardingViewProps {
  onComplete: () => void;
}

const LEVELS: { value: StudyLevel; label: string; description: string }[] = [
  { value: "high_school", label: "High School", description: "Grades 9-12, A-levels, IB" },
  { value: "university", label: "University", description: "Bachelor's, Master's, PhD" },
  { value: "exam_prep", label: "Exam Prep", description: "SAT, MCAT, Bar, CPA" },
  { value: "professional", label: "Professional", description: "Certifications, skills" },
];

const POPULAR_SUBJECTS = [
  "Biology", "Chemistry", "Physics", "Mathematics", "History", "Psychology",
  "Economics", "Computer Science", "Medicine", "Law", "Languages", "Business",
  "Anatomy", "Statistics", "Literature", "Philosophy", "Sociology", "Engineering",
];

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "OTHER", name: "Other", flag: "🌍" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "other", name: "Other", flag: "🌍" },
];

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const { completeOnboarding, skipOnboarding } = usePersonalization();
  const { updateLanguage } = useSettings();
  
  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [level, setLevel] = useState<StudyLevel | null>(null);
  const [examDate, setExamDate] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects(prev => [...prev, trimmed]);
      setCustomSubject("");
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
    onComplete();
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!level || selectedSubjects.length === 0) return;
    
    setIsSubmitting(true);

    // Save the chosen language to app settings
    if (language && language !== "other") {
      updateLanguage(language as Language);
    }

    const success = await completeOnboarding({
      subjects: selectedSubjects,
      level,
      exam_date: examDate || undefined,
    });

    if (success) {
      onComplete();
    }
    setIsSubmitting(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-[10000]"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }} />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
      </div>
      
      {/* Content */}
      <div className="relative w-full max-w-xl">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute -top-12 right-0 text-sm transition-colors"
          style={{ color: '#5f6368' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#5f6368'}
        >
          Skip for now →
        </button>

        {/* Card */}
        <div 
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#0f1d32', border: '1px solid rgba(6, 182, 212, 0.2)' }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                {step === 1 && "What do you study?"}
                {step === 2 && "What's your level?"}
                {step === 3 && "Any upcoming exams?"}
              </h1>
              <span className="text-sm font-medium" style={{ color: '#5f6368' }}>
                {step}/{totalSteps}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e3a5f' }}>
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${(step / totalSteps) * 100}%`,
                  background: 'linear-gradient(90deg, #1a73e8 0%, #3b82f6 100%)'
                }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="px-8 pb-8">
            {/* Step 1: Subjects */}
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-sm" style={{ color: '#5f6368' }}>
                  Select all that apply. This helps us personalize your experience.
                </p>

                {/* Subject chips */}
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SUBJECTS.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => toggleSubject(subject)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                      style={{
                        backgroundColor: selectedSubjects.includes(subject) ? '#1a73e8' : 'rgba(26, 115, 232, 0.1)',
                        color: selectedSubjects.includes(subject) ? '#ffffff' : '#5f6368',
                        border: selectedSubjects.includes(subject) ? '1px solid #1a73e8' : '1px solid rgba(26, 115, 232, 0.2)',
                      }}
                    >
                      {subject}
                      {selectedSubjects.includes(subject) && (
                        <span className="ml-2">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom subject */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomSubject()}
                    placeholder="Add another subject..."
                    className="flex-1 px-4 py-3 rounded-xl transition-colors focus:outline-none"
                    style={{ 
                      backgroundColor: 'rgba(6, 182, 212, 0.05)', 
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      color: '#ffffff',
                    }}
                  />
                  <button
                    onClick={addCustomSubject}
                    disabled={!customSubject.trim()}
                    className="px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1e3a5f', color: '#ffffff' }}
                  >
                    Add
                  </button>
                </div>

                {/* Selected count */}
                {selectedSubjects.length > 0 && (
                  <p className="text-sm" style={{ color: '#22d3ee' }}>
                    {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Level */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                  We'll adjust the difficulty of your study materials.
                </p>

                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className="w-full p-4 rounded-xl text-left transition-all flex items-center justify-between"
                    style={{
                      backgroundColor: level === l.value ? '#1a73e8' : 'rgba(26, 115, 232, 0.05)',
                      border: level === l.value ? '1px solid #1a73e8' : '1px solid rgba(26, 115, 232, 0.2)',
                      color: '#ffffff',
                    }}
                  >
                    <div>
                      <div className="font-semibold" style={{ color: '#ffffff' }}>{l.label}</div>
                      <div className="text-sm" style={{ color: level === l.value ? 'rgba(255,255,255,0.8)' : '#5f6368' }}>
                        {l.description}
                      </div>
                    </div>
                    {level === l.value && (
                      <svg className="w-5 h-5" style={{ color: '#ffffff' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Country */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                  This helps us customize content and currency for you.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCountry(c.code)}
                      className="p-4 rounded-xl text-left transition-all flex items-center gap-3"
                      style={{
                        backgroundColor: country === c.code ? '#1a73e8' : 'rgba(26, 115, 232, 0.05)',
                        border: country === c.code ? '1px solid #1a73e8' : '1px solid rgba(26, 115, 232, 0.2)',
                        color: '#ffffff',
                      }}
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className="font-medium text-sm">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Language */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                  Choose your preferred study language.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className="p-4 rounded-xl text-left transition-all flex items-center gap-3"
                      style={{
                        backgroundColor: language === lang.code ? '#1a73e8' : 'rgba(26, 115, 232, 0.05)',
                        border: language === lang.code ? '1px solid #1a73e8' : '1px solid rgba(26, 115, 232, 0.2)',
                        color: '#ffffff',
                      }}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="font-medium text-sm">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Exam date */}
            {step === 5 && (
              <div className="space-y-6">
                <p className="text-sm" style={{ color: '#5f6368' }}>
                  Optional — helps us prioritize what you need to learn.
                </p>

                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  min={today}
                  max={maxDateStr}
                  className="w-full px-4 py-4 rounded-xl focus:outline-none"
                  style={{ 
                    backgroundColor: 'rgba(6, 182, 212, 0.05)', 
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    color: '#ffffff',
                    colorScheme: 'dark',
                  }}
                />

                {examDate && (
                  <div 
                    className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
                  >
                    <span>📅</span>
                    <span className="text-sm" style={{ color: '#22d3ee' }}>
                      We'll help you prepare for your exam on{" "}
                      <strong style={{ color: '#ffffff' }}>{new Date(examDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
                    </span>
                  </div>
                )}

                {/* Summary */}
                <div 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.15)' }}
                >
                  <h3 className="text-sm font-medium mb-3" style={{ color: '#5f6368' }}>Your profile</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#5f6368' }}>📚</span>
                      <span style={{ color: '#e2e8f0' }}>{selectedSubjects.join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#5f6368' }}>📋</span>
                      <span style={{ color: '#e2e8f0' }}>{LEVELS.find(l => l.value === level)?.label}</span>
                    </div>
                    {country && (
                      <div className="flex items-center gap-2">
                        <span>{COUNTRIES.find(c => c.code === country)?.flag}</span>
                        <span style={{ color: '#e2e8f0' }}>{COUNTRIES.find(c => c.code === country)?.name}</span>
                      </div>
                    )}
                    {language && (
                      <div className="flex items-center gap-2">
                        <span>{LANGUAGES.find(l => l.code === language)?.flag}</span>
                        <span style={{ color: '#e2e8f0' }}>{LANGUAGES.find(l => l.code === language)?.name}</span>
                      </div>
                    )}
                    {examDate && (
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#5f6368' }}>📅</span>
                        <span style={{ color: '#e2e8f0' }}>{new Date(examDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 transition-colors"
                style={{ color: '#5f6368' }}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && selectedSubjects.length === 0) || 
                  (step === 2 && !level) ||
                  (step === 3 && !country) ||
                  (step === 4 && !language)
                }
                className="px-8 py-3 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ 
                  backgroundColor: '#1a73e8', 
                  color: '#ffffff',
                }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 font-semibold rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
                style={{ 
                  background: 'linear-gradient(90deg, #1a73e8 0%, #3b82f6 100%)', 
                  color: '#ffffff',
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Get Started
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

