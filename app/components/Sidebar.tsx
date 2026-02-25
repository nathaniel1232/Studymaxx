"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: "dashboard" | "settings" | "pricing" | "about" | "tips" | "audio" | "summarizer") => void;
  onSignOut: () => void;
  isPremium: boolean;
  userName?: string;
  userEmail?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
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

const SummarizerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);

const NAV_ITEMS_BASE = [
  { id: "dashboard" as const, label: "Dashboard", Icon: HomeIcon },
  { id: "audio" as const, label: "AI Note Taker", Icon: MicIcon },
  { id: "summarizer" as const, label: "Summarizer", Icon: SummarizerIcon },
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
  userEmail,
  onCollapsedChange
}: SidebarProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Notify parent of collapsed state changes
  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const NAV_ITEMS = isPremium 
    ? [
        NAV_ITEMS_BASE[0],
        NAV_ITEMS_BASE[1],
        NAV_ITEMS_BASE[2],
        ...NAV_ITEMS_BASE.slice(3),
      ]
    : [
        NAV_ITEMS_BASE[0],
        NAV_ITEMS_BASE[1],
        NAV_ITEMS_BASE[2],
        { id: "pricing" as const, label: "Upgrade", Icon: DiamondIcon },
        ...NAV_ITEMS_BASE.slice(3),
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
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
      alert("Could not open subscription management.");
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackText, email: userEmail, type: 'general' })
      });
      setFeedbackSent(true);
      setFeedbackText("");
      setTimeout(() => { setFeedbackSent(false); setShowFeedback(false); }, 2000);
    } catch (e) {
      console.error('Failed to send feedback:', e);
    }
  };

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.id === "pricing") {
      onNavigate("pricing");
    } else if (item.id === "about") {
      window.location.href = "/about";
    } else {
      onNavigate(item.id);
    }
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <style>{`
        .sidebar-nav-btn:hover { filter: brightness(1.1); opacity: 0.85; }
        .sidebar-nav-btn.active { opacity: 1; }
        .sidebar-upgrade-btn:hover { filter: brightness(1.12); box-shadow: 0 4px 14px rgba(6,182,212,0.35) !important; transform: translateY(-1px); }
        .sidebar-premium-btn:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(251,188,4,0.3) !important; transform: translateY(-1px); }
        .sidebar-signout-btn:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(239,68,68,0.3) !important; transform: translateY(-1px); }
        .sidebar-feedback-btn:hover { background: rgba(6,182,212,0.08) !important; color: #06b6d4 !important; }
        .sidebar-nav-btn, .sidebar-upgrade-btn, .sidebar-premium-btn, .sidebar-signout-btn, .sidebar-feedback-btn {
          transition: all 0.18s ease;
        }
      `}</style>
      <div className="p-5 border-b flex-shrink-0" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
        {collapsed ? (
          <div className="text-xl font-bold text-center">
            <span style={{ color: '#06b6d4' }}>S</span>
          </div>
        ) : (
          <>
            <div className="text-xl font-bold mb-1">
              <span style={{ color: '#06b6d4' }}>Study</span>
              <span style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Maxx</span>
            </div>
            {userName && <p className="text-sm" style={{ color: '#5f6368' }}>{userName}</p>}
            {isPremium && (
              <span className="inline-block mt-2 px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(251, 188, 4, 0.15)', color: '#fbbc04' }}>PRO</span>
            )}
          </>
        )}
      </div>
      <nav className="p-3 flex-1 overflow-y-auto min-h-0">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
            className={`sidebar-nav-btn ${item.id === currentView ? 'active' : ''} ${item.id === 'pricing' ? 'sidebar-upgrade-btn' : ''} w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-4 py-3 rounded-xl mb-1 text-left`}
            title={collapsed ? item.label : undefined}
            style={item.id === "pricing" ? {
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#06b6d4',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            } : { 
              backgroundColor: currentView === item.id ? (isDarkMode ? 'rgba(26, 115, 232, 0.2)' : 'rgba(26, 115, 232, 0.1)') : 'transparent',
              color: currentView === item.id ? '#1a73e8' : '#5f6368'
            }}
          >
            <span className="text-lg flex-shrink-0"><item.Icon /></span>
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </button>
        ))}
        {isPremium && (
          <button
            onClick={() => { handleManageSubscription(); setMobileOpen(false); }}
            className={`sidebar-premium-btn w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-4 py-3 rounded-xl mb-1 text-left`}
            title={collapsed ? 'Manage Subscription' : undefined}
            style={{ background: 'rgba(251, 188, 4, 0.08)', color: '#f59e0b', border: '1px solid rgba(251, 188, 4, 0.2)' }}
          >
            <span className="text-lg flex-shrink-0"><DiamondIcon /></span>
            {!collapsed && <span className="font-medium text-sm">Manage Subscription</span>}
          </button>
        )}
        {!collapsed && (
          <button
            onClick={() => setShowFeedback(true)}
            className="sidebar-feedback-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-left"
            style={{ color: isDarkMode ? '#94a3b8' : '#5f6368' }}
          >
            <span><MessageIcon /></span>
            <span className="font-medium text-sm">Send Feedback</span>
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setShowFeedback(true)}
            className="sidebar-feedback-btn w-full flex items-center justify-center px-4 py-3 rounded-xl mb-1"
            title="Send Feedback"
            style={{ color: isDarkMode ? '#94a3b8' : '#5f6368' }}
          >
            <span><MessageIcon /></span>
          </button>
        )}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
          <button
            onClick={() => { onSignOut(); setMobileOpen(false); }}
            className={`sidebar-signout-btn w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-4 py-3 rounded-xl text-left`}
            title={collapsed ? 'Sign Out' : undefined}
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            <span className="text-lg flex-shrink-0"><LogOutIcon /></span>
            {!collapsed && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop: collapsible sidebar */}
      <div 
        className={`hidden md:block fixed left-0 top-0 h-full z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
        style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f8fafc', borderRight: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}
      >
        {sidebarContent}
        {/* Collapse/Expand toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-7 w-6 h-6 rounded-full items-center justify-center z-50 transition-all duration-200 hover:scale-110"
          style={{ 
            backgroundColor: isDarkMode ? '#2a2a4e' : '#ffffff', 
            border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
            color: isDarkMode ? '#94a3b8' : '#5f6368',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
      </div>

      {/* Dispatch sidebar state via custom event for parent layout */}
      <input type="hidden" data-sidebar-collapsed={collapsed ? 'true' : 'false'} />

      {/* Mobile: hamburger toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{ 
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
          color: isDarkMode ? '#e2e8f0' : '#334155'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      <div 
        className={`md:hidden fixed left-0 top-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f8fafc', borderRight: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}
      >
        {sidebarContent}
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFeedback(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Send Feedback</h3>
            {feedbackSent ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4" style={{ color: '#34a853', width: '48px' }}><CheckCircleIcon /></div>
                <p style={{ color: '#34a853' }}>Thanks for your feedback!</p>
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you think, report bugs, or suggest features..."
                  className="w-full h-32 p-4 rounded-xl resize-none outline-none"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#000000', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowFeedback(false)} className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#475569' }}>Cancel</button>
                  <button onClick={handleSendFeedback} className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors" style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
