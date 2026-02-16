"use client";

import { useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const { settings } = useSettings();
  const router = useRouter();
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [copied, setCopied] = useState(false);
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
        
        <h1 className="text-4xl font-bold mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
          About <span style={{ color: '#06b6d4' }}>Study</span>Maxx
        </h1>
        
        <p className="text-lg mb-8" style={{ color: '#5f6368' }}>
          The AI-powered study tool that helps you learn smarter, not harder.
        </p>
        
        <div className="space-y-6">
          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>Our Mission</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              We believe studying shouldn't be painful. StudyMaxx uses advanced AI to transform any content - notes, PDFs, YouTube videos, audio recordings - into personalized study materials that actually help you learn.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>How It Works</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Simply paste your notes, upload a document, or share a YouTube link. Our AI analyzes the content and generates high-quality flashcards, quizzes, and summaries tailored to help you ace your exams.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}>🛡️ Privacy First</h2>
            <p style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Your study materials are your own. We never sell your data or use it to train AI models. Your content is processed securely and only stored to improve your personal study experience.
            </p>
          </div>

          <div className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: '#22d3ee' }}>📧 Contact Us</h2>
            <p className="mb-4" style={{ color: isDarkMode ? '#94a3b8' : '#374151' }}>
              Have questions, feedback, or suggestions? We'd love to hear from you!
            </p>
            <button 
              onClick={() => { setShowEmailPopup(true); setCopied(false); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}
            >
              Contact Us
            </button>
          </div>

          {/* Email Popup */}
          {showEmailPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowEmailPopup(false)}>
              <div 
                className="mx-4 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center"
                style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-4xl mb-3">📧</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Get in touch</h3>
                <p className="text-sm mb-4" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Send us an email at:</p>
                <div 
                  className="px-4 py-3 rounded-xl mb-4 font-mono text-sm select-all"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}
                >
                  studymaxxer@gmail.com
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText('studymaxxer@gmail.com');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex-1 py-2.5 rounded-xl font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: '#06b6d4', color: '#ffffff' }}
                  >
                    {copied ? '✓ Copied!' : 'Copy Email'}
                  </button>
                  <button
                    onClick={() => setShowEmailPopup(false)}
                    className="px-4 py-2.5 rounded-xl font-medium transition-all"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#374151' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-12 pt-8 border-t text-center" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <p className="text-sm" style={{ color: isDarkMode ? '#64748b' : '#475569' }}>
            © 2026 StudyMaxx. Made with 💙 for students everywhere.
          </p>
        </div>
      </div>
    </div>
  );
}
