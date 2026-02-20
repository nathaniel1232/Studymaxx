"use client";

import { useState, useEffect } from "react";
import { FlashcardSet, deleteFlashcardSet } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";
import { getStreakStatus, getWeeklyActivity, getStreaksAtRisk } from "../utils/streak";
// WelcomeCard removed - personalization disabled

interface DashboardViewProps {
  onSelectOption: (option: "notes" | "audio" | "document" | "youtube" | "mathmaxx") => void;
  onCreateFlashcards: () => void;
  onLoadSet: (flashcards: import("../utils/storage").Flashcard[], setId: string) => void;
  isPremium: boolean;
  userName?: string;
  user?: any;
  onBack?: () => void;
  onSettings?: () => void;
  savedSets: FlashcardSet[];
  onMathMaxx?: () => void;
  onSummarizer?: () => void;
  onDeleteSet?: () => void;
}

// Custom SVG icon components
const DocumentIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#000000" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const INPUT_OPTIONS = [
  {
    id: "document" as const,
    Icon: DocumentIcon,
    title: "Upload Files or Images",
    subtitle: "PDF, DOC, PPT, images, or paste text",
    color: "#1a73e8",
    bgColor: "rgba(26, 115, 232, 0.1)",
    hoverBg: "rgba(26, 115, 232, 0.15)",
  },
  {
    id: "audio" as const,
    Icon: MicrophoneIcon,
    title: "AI Note Taker",
    subtitle: "Record lectures, take notes, generate study sets",
    color: "#ea4335",
    bgColor: "rgba(234, 67, 53, 0.1)",
    hoverBg: "rgba(234, 67, 53, 0.15)",
  },
  {
    id: "youtube" as const,
    Icon: LinkIcon,
    title: "Import from URL",
    subtitle: "YouTube videos, articles, websites",
    color: "#34a853",
    bgColor: "rgba(52, 168, 83, 0.1)",
    hoverBg: "rgba(52, 168, 83, 0.15)",
  },
  {
    id: "notes" as const,
    Icon: PencilIcon,
    title: "Quick Notes",
    subtitle: "Type or paste text directly",
    color: "#fbbc04",
    bgColor: "rgba(251, 188, 4, 0.1)",
    hoverBg: "rgba(251, 188, 4, 0.15)",
  },
];

export default function DashboardView({ 
  onSelectOption, 
  onCreateFlashcards, 
  onLoadSet,
  isPremium,
  userName,
  user,
  onBack,
  onSettings,
  savedSets,
  onMathMaxx,
  onSummarizer,
  onDeleteSet
}: DashboardViewProps) {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<"my-notes" | "shared">("my-notes");
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [isDeletingSet, setIsDeletingSet] = useState(false);

  const confirmDeleteSet = async () => {
    if (!deletingSetId) return;
    setIsDeletingSet(true);
    try {
      await deleteFlashcardSet(deletingSetId);
      setDeletingSetId(null);
      if (onDeleteSet) onDeleteSet();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeletingSet(false);
    }
  };
  const [showAIChat, setShowAIChat] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Track whether free trial has been used (1 upload trial for files OR audio)
  const [uploadTrialUsed, setUploadTrialUsed] = useState(false);

  useEffect(() => {
    console.log('[DashboardView] isPremium prop received:', isPremium);
    console.log('[DashboardView] isPremium type:', typeof isPremium);
    console.log('[DashboardView] User:', user?.email);
    
    if (!isPremium) {
      // Combined trial key for both document and audio uploads
      const uploadKey = `upload_trial_used_${user?.id || 'anon'}`;
      const trialUsed = localStorage.getItem(uploadKey) === 'true';
      setUploadTrialUsed(trialUsed);
      console.log('[DashboardView] Free user - trial used:', trialUsed);
    } else {
      console.log('[DashboardView] ✅ PREMIUM USER - No upload restrictions');
      setUploadTrialUsed(false); // Reset for premium users
    }
  }, [isPremium, user]);

  // Determine if dark mode
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleOptionClick = (option: typeof INPUT_OPTIONS[0]) => {
    // If trial is used for upload features, redirect to pricing
    if (!isPremium && uploadTrialUsed) {
      if (option.id === 'document' || option.id === 'audio') {
        window.location.href = '/pricing';
        return;
      }
    }
    onSelectOption(option.id);
  };

  // Streak data
  const [streakData, setStreakData] = useState<ReturnType<typeof getStreakStatus> | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<ReturnType<typeof getWeeklyActivity>>([]);
  const [atRiskStreaks, setAtRiskStreaks] = useState<ReturnType<typeof getStreaksAtRisk>>([]);

  useEffect(() => {
    setStreakData(getStreakStatus());
    setWeeklyActivity(getWeeklyActivity());
    setAtRiskStreaks(getStreaksAtRisk());
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Handle chat message submission
  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatLoading) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          userId: user?.id || 'anonymous',
          context: 'You are StudyMaxx AI, a helpful study assistant built into StudyMaxx. Help users navigate and answer questions. Features: Quick Notes (type/paste text), Upload Files (PDF/images, premium), Import URL (YouTube/websites), flashcard study, quiz mode, match game, AI chat, MathMaxx (math practice with school-level problems), audio recording (record lectures). Premium unlocks unlimited sets, file uploads, all difficulty levels, up to 75 cards per set, and MathMaxx. To start studying, click Create New on the dashboard.',
          history: chatMessages.slice(-6),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullText += parsed.text;
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }
        }
      }

      if (fullText) {
        setChatMessages(prev => [...prev, { role: 'ai', text: fullText }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I had trouble understanding that. Can you try asking differently?' }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Oops! Something went wrong. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          {userName && (
            <p className="text-sm md:text-base mb-1" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Welcome back, <span style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{userName}</span>
            </p>
          )}
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
            What would you like to create?
          </h1>
        </div>

        {/* Welcome & Personalization Card removed */}

        {/* Study Streak Banner - only show after user has created at least one study set */}
        {streakData && savedSets.length > 0 && (
          <div 
            className="mb-8 p-5 rounded-2xl transition-all duration-300"
            style={{
              background: streakData.studiedToday
                ? isDarkMode 
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)'
                : isDarkMode
                  ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
              border: streakData.studiedToday
                ? '1px solid rgba(34, 197, 94, 0.25)'
                : '1px solid rgba(251, 146, 60, 0.25)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Streak Fire Emoji */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl"
                  style={{
                    background: streakData.studiedToday
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(251, 146, 60, 0.15)',
                  }}
                >
                  {streakData.studiedToday ? '⚡' : '📚'}
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>
                    {streakData.studiedToday 
                      ? streakData.overallStreak > 1 
                        ? `${streakData.overallStreak} day streak! Keep it up!`
                        : "Great job studying today!"
                      : streakData.overallStreak > 0
                        ? `Don't break your ${streakData.overallStreak} day streak!`
                        : "You haven't studied today yet"
                    }
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                    {streakData.studiedToday 
                      ? `Current streak: ${streakData.overallStreak} days`
                      : "Open a study set to keep your streak going"
                    }
                  </p>
                </div>
              </div>

              {/* Weekly Activity Dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {weeklyActivity.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: day.studied
                          ? 'rgba(34, 197, 94, 0.25)'
                          : isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: day.studied
                          ? '1.5px solid rgba(34, 197, 94, 0.4)'
                          : `1.5px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      }}
                    >
                      {day.studied && (
                        <svg className="w-3.5 h-3.5" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>{day.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* At-risk streaks warning */}
            {atRiskStreaks.length > 0 && !streakData.studiedToday && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(251, 146, 60, 0.15)' }}>
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  ⚡ Streak at risk: {atRiskStreaks.map(s => s.setName).join(', ')} — study now to keep your streak!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Input Options - NotebookLM Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {INPUT_OPTIONS.map((option) => {
            const IconComponent = option.Icon;
            const isLocked = !isPremium && (
              (option.id === 'document' || option.id === 'audio') && uploadTrialUsed
            );
            const isFreeTrial = !isPremium && !isLocked && (option.id === 'document' || option.id === 'audio');
            
            // Debug logging for each option
            if (option.id === 'document' || option.id === 'audio') {
              console.log(`[DashboardView] ${option.id}: isPremium=${isPremium}, isLocked=${isLocked}, isFreeTrial=${isFreeTrial}`);
            }
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className="group relative p-5 rounded-2xl text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', 
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                  boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                  opacity: isLocked ? 0.7 : 1,
                }}
              >
                {/* Lock badge */}
                {isLocked && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                    Premium
                  </div>
                )}
                {/* Free trial badge */}
                {isFreeTrial && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                    1 free try
                  </div>
                )}
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: option.bgColor, color: option.color }}
                  >
                    <IconComponent />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-medium mb-1 flex items-center gap-2" style={{ color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>
                      {option.title}
                      {isLocked ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ef4444' }}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                      ) : (
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: option.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </h3>
                    <p className="text-xs md:text-sm" style={{ color: isDarkMode ? '#9ca3af' : '#475569' }}>
                      {isLocked ? 'Upgrade to Premium to unlock' : option.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Premium Upgrade Banner - show only for free users */}
        {!isPremium && (
          <div 
            className="mb-10 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer"
            onClick={() => window.location.href = '/pricing'}
            style={{ 
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)' 
                : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
              border: isDarkMode ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(6, 182, 212, 0.2)',
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>
                    Study smarter with Premium — unlimited sets, 50 cards, custom difficulty
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: isDarkMode ? '#94a3b8' : '#475569' }}>
                    Students who study more, score higher. Upgrade to unlock your full potential.
                  </p>
                </div>
              </div>
              <button 
                className="px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all hover:shadow-md hover:scale-105"
                style={{ 
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', 
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                }}
              >
                Upgrade →
              </button>
            </div>
          </div>
        )}

        {/* Section Header - NotebookLM Style */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Your Study Sets</h2>
          {savedSets.length > 0 && (
            <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: isDarkMode ? 'rgba(26, 115, 232, 0.2)' : 'rgba(26, 115, 232, 0.1)', color: '#1a73e8' }}>
              {savedSets.length} {savedSets.length === 1 ? 'set' : 'sets'}
            </span>
          )}
        </div>

        {/* Tabs - NotebookLM Style */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e8eef5' }}>
          <button
            onClick={() => setActiveTab("my-notes")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ 
              backgroundColor: activeTab === "my-notes" ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
              color: activeTab === "my-notes" ? (isDarkMode ? '#e2e8f0' : '#000000') : '#5f6368',
              boxShadow: activeTab === "my-notes" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            My Sets
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ 
              backgroundColor: activeTab === "shared" ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
              color: activeTab === "shared" ? (isDarkMode ? '#e2e8f0' : '#000000') : '#5f6368',
              boxShadow: activeTab === "shared" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Shared with Me
          </button>
        </div>

        {/* Study Sets List or Empty State - NotebookLM Style */}
        {savedSets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedSets.map((set) => (
              <div
                key={set.id}
                className="p-5 rounded-2xl"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', 
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: isDarkMode ? 'rgba(26, 115, 232, 0.2)' : 'rgba(26, 115, 232, 0.1)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#1a73e8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-xs" style={{ color: '#5f6368' }}>
                    {formatDate(set.lastStudied || set.createdAt)}
                  </span>
                </div>
                
                <h3 className="font-medium mb-1 line-clamp-1" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                  {set.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: '#5f6368' }}>
                  {set.flashcards.length} cards{set.subject && ` · ${set.subject}`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLoadSet(set.flashcards, set.id)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}
                  >
                    Study →
                  </button>
                  <button
                    onClick={() => setDeletingSetId(set.id)}
                    className="p-2 rounded-lg transition-all hover:bg-red-500/15"
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', flexShrink: 0 }}
                    title="Delete set"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="rounded-2xl p-16 text-center"
            style={{ 
              backgroundColor: 'rgba(6, 182, 212, 0.05)', 
              border: '2px dashed rgba(6, 182, 212, 0.2)' 
            }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}>
              <svg className="w-8 h-8" style={{ color: '#06b6d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              No study sets yet
            </h3>
            <p className="mb-6" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Create your first study set by choosing an option above
            </p>
            <button
              onClick={onCreateFlashcards}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105"
              style={{ backgroundColor: '#1a73e8', color: '#ffffff', boxShadow: '0 2px 8px rgba(26, 115, 232, 0.3)' }}
            >
              Create Study Set
            </button>
          </div>
        )}

        {/* Delete Set Confirmation Modal */}
      {deletingSetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setDeletingSetId(null)}>
          <div className="rounded-xl shadow-2xl max-w-sm w-full p-6" style={{ background: isDarkMode ? '#1a1a2e' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <svg className="w-7 h-7" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Delete Study Set?</h3>
              <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                "{savedSets.find(s => s.id === deletingSetId)?.name}" will be permanently deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingSetId(null)} className="flex-1 py-3 rounded-xl font-medium" style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0', color: isDarkMode ? '#ffffff' : '#000000' }}>Cancel</button>
              <button onClick={confirmDeleteSet} disabled={isDeletingSet} className="flex-1 py-3 rounded-xl font-medium text-white disabled:opacity-60" style={{ background: '#ef4444' }}>
                {isDeletingSet ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat */}
        {showAIChat ? (
          <div 
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 sm:bottom-6 sm:right-6 rounded-2xl overflow-hidden shadow-2xl z-50"
            style={{ 
              backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid rgba(6, 182, 212, 0.2)' 
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>StudyMaxx AI</h4>
                <button 
                  onClick={() => setShowAIChat(false)}
                  className="text-sm hover:text-cyan-500 transition-colors"
                  style={{ color: '#64748b' }}
                >
                  Hide →
                </button>
              </div>
              <p className="text-sm mt-1" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                I can help you create flashcards and answer questions.
              </p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-96">
              {chatMessages.length === 0 ? (
                <div 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
                >
                  <input
                    type="text"
                    placeholder="Ask me anything..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                  className="flex-1 outline-none text-sm bg-transparent"
                  style={{ 
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                  />
                  <button 
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatMessage.trim()}
                    className="p-2 rounded-lg transition-all duration-200 hover:bg-cyan-500/20 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                    style={{ color: '#06b6d4' }}
                  >
                    {isChatLoading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className="max-w-[80%] px-4 py-2 rounded-lg text-sm"
                          style={{
                            backgroundColor: msg.role === 'user' 
                              ? '#06b6d4' 
                              : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            color: msg.role === 'user' ? '#ffffff' : isDarkMode ? '#ffffff' : '#000000'
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl sticky bottom-0"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <input
                      type="text"
                      placeholder="Ask me anything..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                      className="flex-1 outline-none text-sm bg-transparent"
                      style={{ 
                        color: isDarkMode ? '#ffffff' : '#000000'
                      }}
                    />
                    <button 
                      onClick={handleChatSubmit}
                      disabled={isChatLoading || !chatMessage.trim()}
                      className="p-2 rounded-lg transition-all duration-200 hover:bg-cyan-500/20 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                      style={{ color: '#06b6d4' }}
                    >
                      {isChatLoading ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAIChat(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
            style={{ 
              backgroundColor: '#06b6d4',
              boxShadow: '0 10px 30px rgba(6, 182, 212, 0.3)'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}
      </div>

    </div>
  );
}


