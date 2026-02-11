"use client";

import { useState } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: "dashboard" | "settings" | "pricing" | "about" | "tips") => void;
  onSignOut: () => void;
  isPremium: boolean;
  userName?: string;
  userEmail?: string;
}

// Custom SVG Icons
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const DiamondIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/>
  </svg>
);

const LightbulbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const NAV_ITEMS_BASE = [
  { id: "dashboard" as const, label: "Dashboard", Icon: HomeIcon },
  { id: "settings" as const, label: "Settings", Icon: SettingsIcon },
  { id: "tips" as const, label: "Study Tips", Icon: LightbulbIcon },
  { id: "about" as const, label: "About Us", Icon: InfoIcon },
];

export default function Sidebar({ 
  currentView, 
  onNavigate, 
  onSignOut, 
  isPremium,
  userName,
  userEmail 
}: SidebarProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  // Debug logging for premium status
  console.log('[Sidebar] 🔍 isPremium:', isPremium, '| type:', typeof isPremium, '| email:', userEmail);

  const NAV_ITEMS = isPremium 
    ? [
        NAV_ITEMS_BASE[0], // Dashboard
        NAV_ITEMS_BASE[1], // Settings
        ...NAV_ITEMS_BASE.slice(2), // Tips, About
      ]
    : [
        NAV_ITEMS_BASE[0], // Dashboard
        NAV_ITEMS_BASE[1], // Settings
        { id: "pricing" as const, label: "Upgrade to Premium", Icon: DiamondIcon },
        ...NAV_ITEMS_BASE.slice(2), // Tips, About
      ];

  const handleManageSubscription = async () => {
    try {
      const { getCurrentUser } = await import("../utils/supabase");
      const user = await getCurrentUser();
      if (!user?.id) return;
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedback: feedbackText,
          email: userEmail,
          type: 'general'
        })
      });
      setFeedbackSent(true);
      setFeedbackText("");
      setTimeout(() => {
        setFeedbackSent(false);
        setShowFeedback(false);
      }, 2000);
    } catch (e) {
      console.error('Failed to send feedback:', e);
    }
  };

  return (
    <>
      {/* Toggle Button - NotebookLM Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
        style={{ 
          backgroundColor: '#1a73e8',
          boxShadow: '0 2px 8px rgba(26, 115, 232, 0.3)'
        }}
      >
        <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel - NotebookLM Style */}
      <div 
        className={`fixed left-0 top-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9', borderRight: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
          <div className="text-xl font-bold mb-1">
            <span style={{ color: '#1a73e8' }}>Study</span>
            <span style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Maxx</span>
          </div>
          {userName && (
            <p className="text-sm" style={{ color: '#5f6368' }}>
              {userName}
            </p>
          )}
          {isPremium && (
            <span 
              className="inline-block mt-2 px-2 py-1 rounded text-xs font-bold"
              style={{ backgroundColor: 'rgba(251, 188, 4, 0.15)', color: '#fbbc04' }}
            >
              PRO
            </span>
          )}
        </div>

        {/* Navigation - NotebookLM Style */}
        <nav className="p-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "pricing") {
                  window.location.href = "/pricing";
                } else if (item.id === "about") {
                  window.location.href = "/about";
                } else {
                  onNavigate(item.id);
                }
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 text-left"
              style={item.id === "pricing" ? {
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                color: '#06b6d4',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              } : { 
                backgroundColor: currentView === item.id ? (isDarkMode ? 'rgba(26, 115, 232, 0.2)' : 'rgba(26, 115, 232, 0.1)') : 'transparent',
                color: currentView === item.id ? '#1a73e8' : '#5f6368'
              }}
              onMouseEnter={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.color = isDarkMode ? '#e2e8f0' : '#000000';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#5f6368';
                }
              }}
            >
              <span className="text-lg"><item.Icon /></span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          {/* Manage Subscription - Premium users */}
          {isPremium && (
            <button
              onClick={() => {
                handleManageSubscription();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 text-left"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                color: '#f59e0b',
                border: '1px solid rgba(251, 188, 4, 0.2)',
              }}
            >
              <span className="text-lg"><DiamondIcon /></span>
              <span className="font-medium">Manage Subscription</span>
            </button>
          )}
          
          {/* Share Button */}
          <button
            onClick={async () => {
              const shareData = {
                title: 'StudyMaxx - AI Study Tool',
                text: 'Check out StudyMaxx! It turns your notes, PDFs, and YouTube videos into flashcards, quizzes, and more using AI.',
                url: 'https://www.studymaxx.net',
              };
              try {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  await navigator.share(shareData);
                } else {
                  await navigator.clipboard.writeText('Check out StudyMaxx! AI-powered flashcards from notes, PDFs & YouTube. https://www.studymaxx.net');
                  alert('Link copied to clipboard!');
                }
              } catch (err) {
                console.log('Share cancelled');
              }
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 text-left"
            style={{ color: '#5f6368' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
              e.currentTarget.style.color = isDarkMode ? '#e2e8f0' : '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#5f6368';
            }}
          >
            <span className="text-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </span>
            <span className="font-medium">Share StudyMaxx</span>
          </button>

          {/* Feedback Button */}
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 text-left"
            style={{ color: '#5f6368' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
              e.currentTarget.style.color = isDarkMode ? '#e2e8f0' : '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#5f6368';
            }}
          >
            <span className="text-lg"><MessageIcon /></span>
            <span className="font-medium">Send Feedback</span>
          </button>
        </nav>

        {/* Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
          <button
            onClick={() => {
              onSignOut();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
            style={{ color: '#ea4335' }}
          >
            <span className="text-lg"><LogOutIcon /></span>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Feedback Modal - NotebookLM Style */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFeedback(false)} />
          <div 
            className="relative w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
              Send Feedback
            </h3>
            
            {feedbackSent ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4" style={{ color: '#34a853', width: '48px' }}>
                  <CheckCircleIcon />
                </div>
                <p style={{ color: '#34a853' }}>Thanks for your feedback!</p>
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you think, report bugs, or suggest features..."
                  className="w-full h-32 p-4 rounded-xl resize-none outline-none"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9', 
                    color: isDarkMode ? '#e2e8f0' : '#000000',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'
                  }}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#475569' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendFeedback}
                    className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                    style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

