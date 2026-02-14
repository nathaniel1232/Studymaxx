"use client";

import { useState } from "react";
import { usePersonalization, StudyLevel } from "../contexts/PersonalizationContext";

interface TurboOnboardingProps {
  onComplete: () => void;
}

// Student types like Turbo.ai
const STUDENT_TYPES = [
  { value: "high_school", label: "High School Student", emoji: "📚", description: "Grades 9-12" },
  { value: "middle_school", label: "Middle School Student", emoji: "📖", description: "Grades 6-8" },
  { value: "university", label: "Undergraduate Student", emoji: "🎓", description: "Bachelor's degree" },
  { value: "graduate", label: "Graduate Student", emoji: "�", description: "Master's or PhD" },
  { value: "professional", label: "Working Professional", emoji: "💼", description: "Career development" },
  { value: "teacher", label: "Teacher / Professor", emoji: "👨‍🏫", description: "Creating study materials" },
  { value: "other", label: "Other", emoji: "📖", description: "Self-learner" },
];

// Standardized tests
const STANDARDIZED_TESTS = [
  { value: "sat", label: "SAT", emoji: "✏️" },
  { value: "act", label: "ACT", emoji: "✏️" },
  { value: "ap", label: "AP Exams", emoji: "📘" },
  { value: "ib", label: "IB Exams", emoji: "🌍" },
  { value: "gre", label: "GRE", emoji: "📊" },
  { value: "mcat", label: "MCAT", emoji: "⚕️" },
  { value: "lsat", label: "LSAT", emoji: "⚖️" },
  { value: "none", label: "None", emoji: "🚫" },
];

// Graduation years
const getGraduationYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear + i);
};

// Common subjects
const SUBJECTS = [
  { value: "math", label: "Mathematics", emoji: "🔢" },
  { value: "science", label: "Science", emoji: "🔬" },
  { value: "biology", label: "Biology", emoji: "🧬" },
  { value: "chemistry", label: "Chemistry", emoji: "⚗️" },
  { value: "physics", label: "Physics", emoji: "⚛️" },
  { value: "history", label: "History", emoji: "📜" },
  { value: "english", label: "English/Literature", emoji: "📚" },
  { value: "languages", label: "Foreign Languages", emoji: "🌐" },
  { value: "computer_science", label: "Computer Science", emoji: "💻" },
  { value: "economics", label: "Economics", emoji: "📈" },
  { value: "psychology", label: "Psychology", emoji: "🧠" },
  { value: "medicine", label: "Medicine/Health", emoji: "🏥" },
  { value: "law", label: "Law", emoji: "⚖️" },
  { value: "business", label: "Business", emoji: "💼" },
  { value: "art", label: "Art/Design", emoji: "🎨" },
  { value: "music", label: "Music", emoji: "🎵" },
];

export default function TurboOnboarding({ onComplete }: TurboOnboardingProps) {
  const { completeOnboarding, skipOnboarding } = usePersonalization();
  
  const [step, setStep] = useState(1);
  const [studentType, setStudentType] = useState<string>("");
  const [standardizedTests, setStandardizedTests] = useState<string[]>([]);
  const [graduationYear, setGraduationYear] = useState<number | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;
  const years = getGraduationYears();

  const toggleTest = (test: string) => {
    if (test === "none") {
      setStandardizedTests(["none"]);
    } else {
      setStandardizedTests(prev => {
        const filtered = prev.filter(t => t !== "none");
        return filtered.includes(test) 
          ? filtered.filter(t => t !== test)
          : [...filtered, test];
      });
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSkip = async () => {
    // Mark as done and go to app
    localStorage.setItem("studymaxx_onboarding_skipped", "true");
    await skipOnboarding();
    onComplete();
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    // Map student type to level
    const levelMap: Record<string, StudyLevel> = {
      high_school: "high_school",
      middle_school: "high_school",
      university: "university",
      graduate: "university",
      professional: "professional",
      teacher: "professional",
      other: "high_school",
    };

    // Save to localStorage immediately
    localStorage.setItem("studymaxx_onboarding", JSON.stringify({
      studentType,
      standardizedTests,
      graduationYear,
      subjects: selectedSubjects,
      completed_at: new Date().toISOString(),
    }));

    // Try to update context
    await completeOnboarding({
      subjects: selectedSubjects.length > 0 ? selectedSubjects : ["General"],
      level: levelMap[studentType] || "high_school",
    });

    setIsSubmitting(false);
    onComplete();
  };

  const canContinue = () => {
    switch (step) {
      case 1: return !!studentType;
      case 2: return standardizedTests.length > 0;
      case 3: return !!graduationYear;
      case 4: return selectedSubjects.length > 0;
      default: return false;
    }
  };

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

      {/* Card */}
      <div 
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(15, 29, 50, 0.95)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
      >
        {/* Progress bar */}
        <div className="px-8 pt-8">
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className="flex-1 h-2 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: s <= step ? '#1a73e8' : 'rgba(255,255,255,0.1)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-6">
          {/* Step 1: What describes you */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                What describes you best?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                We use this to personalize your experience - should only take 15 seconds! :)
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {STUDENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setStudentType(type.value)}
                    className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                    style={{
                      backgroundColor: studentType === type.value ? 'rgba(26, 115, 232, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: studentType === type.value ? '2px solid #1a73e8' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <div>
                      <div className="font-semibold" style={{ color: '#ffffff' }}>{type.label}</div>
                      <div className="text-xs" style={{ color: '#5f6368' }}>{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Standardized tests */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                Are you studying for any standardized tests?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                Select all that apply
              </p>

              <div className="grid grid-cols-2 gap-3">
                {STANDARDIZED_TESTS.map((test) => (
                  <button
                    key={test.value}
                    onClick={() => toggleTest(test.value)}
                    className="p-4 rounded-xl text-left transition-all flex items-center gap-3"
                    style={{
                      backgroundColor: standardizedTests.includes(test.value) ? 'rgba(26, 115, 232, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: standardizedTests.includes(test.value) ? '2px solid #1a73e8' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="text-xl">{test.emoji}</span>
                    <span className="font-medium" style={{ color: '#ffffff' }}>{test.label}</span>
                    {standardizedTests.includes(test.value) && (
                      <span className="ml-auto text-cyan-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Graduation year */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                What year will you graduate?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                We use this to personalize and enhance your experience!
              </p>

              <div className="space-y-3">
                {years.map((year, index) => (
                  <button
                    key={year}
                    onClick={() => setGraduationYear(year)}
                    className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                    style={{
                      backgroundColor: graduationYear === year ? 'rgba(26, 115, 232, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: graduationYear === year ? '2px solid #1a73e8' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ 
                        backgroundColor: graduationYear === year ? '#1a73e8' : 'rgba(26, 115, 232, 0.3)',
                        color: '#ffffff'
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="font-semibold" style={{ color: '#ffffff' }}>{year}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Subjects */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
                What subjects are you studying?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
                Select all that apply - we'll personalize your study materials
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-2">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject.value}
                    onClick={() => toggleSubject(subject.value)}
                    className="p-3 rounded-xl text-left transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: selectedSubjects.includes(subject.value) ? 'rgba(26, 115, 232, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: selectedSubjects.includes(subject.value) ? '2px solid #1a73e8' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="text-lg">{subject.emoji}</span>
                    <span className="text-sm font-medium" style={{ color: '#ffffff' }}>{subject.label}</span>
                  </button>
                ))}
              </div>

              {selectedSubjects.length > 0 && (
                <p className="mt-4 text-sm" style={{ color: '#22d3ee' }}>
                  {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <button
            onClick={step === totalSteps ? handleComplete : handleNext}
            disabled={!canContinue() || isSubmitting}
            className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: canContinue() ? '#1a73e8' : 'rgba(255,255,255,0.1)',
              color: '#ffffff'
            }}
          >
            {isSubmitting ? 'Setting up...' : step === totalSteps ? 'Get Started' : 'Continue'}
          </button>

          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="text-sm transition-colors"
                style={{ color: '#5f6368' }}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleSkip}
              className="text-sm font-medium transition-colors hover:underline"
              style={{ color: '#5f6368' }}
            >
              Skip Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

