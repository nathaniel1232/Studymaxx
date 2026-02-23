"use client";

import { useSettings } from "../contexts/SettingsContext";
import { useRouter } from "next/navigation";

// Custom SVG Icon
const BookOpenIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

export default function StudyTipsPage() {
  const { settings } = useSettings();
  const router = useRouter();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button 
          onClick={handleBack}
          className="inline-flex items-center gap-2 mb-8 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border"
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff',
            color: isDarkMode ? '#e2e8f0' : '#0f172a',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.12)' : '#f1f5f9';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </button>
        
        <h1 className="text-4xl font-bold mb-8 flex items-center" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>
          <span style={{ color: '#22d3ee' }}><BookOpenIcon /></span> Study Tips
        </h1>
        
        <div className="space-y-6">
          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: '#22d3ee' }}>1. Active Recall</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Instead of passively re-reading notes, actively test yourself. Use flashcards and try to recall information before flipping to check your answer. This strengthens memory pathways.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: '#22d3ee' }}>2. Spaced Repetition</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Review material at increasing intervals. Study new concepts frequently, then gradually space out reviews. This is proven to improve long-term retention.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: '#22d3ee' }}>3. Pomodoro Technique</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Study for 25 minutes, then take a 5-minute break. After 4 sessions, take a longer 15-30 minute break. This prevents burnout and maintains focus.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: '#22d3ee' }}>4. Teach What You Learn</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Explaining concepts to others (or even yourself) helps identify gaps in your understanding and reinforces learning. If you can teach it, you know it.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: '#22d3ee' }}>5. Stay Hydrated & Rest Well</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Your brain needs water and sleep to function optimally. Aim for 7-9 hours of sleep and keep a water bottle nearby while studying.
            </p>
          </div>

          {/* Premium CTA */}
          <div 
            className="p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => window.dispatchEvent(new Event('showPremium'))}
            style={{ 
              background: isDarkMode 
                ? 'rgba(6, 182, 212, 0.1)'
                : 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#06b6d4' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>
                  Put these tips into practice with Premium
                </h3>
                <p className="text-sm mt-1" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                  Unlimited study sets, custom difficulty, 50 cards per set, and AI chat to help you study smarter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
