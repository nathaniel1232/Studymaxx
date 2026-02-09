"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import InputView from "./components/InputView";
import CreateFlowView from "./components/CreateFlowView";
import StudyView from "./components/StudyViewNew";
import SavedSetsView from "./components/SavedSetsView";
import SettingsView from "./components/SettingsView";
import LoginModal from "./components/LoginModal";
import UserProfileDropdown from "./components/UserProfileDropdown";
import StudyFactBadge from "./components/StudyFactBadge";
import LiveVisitorsCounter from "./components/LiveVisitorsCounter";
import AnimatedCounter from "./components/AnimatedCounter";
import Toast from "./components/Toast";
import FeedbackModal from "./components/FeedbackModal";
import { getCookieConsent } from "./components/CookieConsent";
import { updateLastStudied, Flashcard, getSavedFlashcardSets, FlashcardSet } from "./utils/storage";
import { getStudyFact } from "./utils/studyFacts";
import { useTranslation, useSettings } from "./contexts/SettingsContext";
import { usePersonalization } from "./contexts/PersonalizationContext";
import ArrowIcon from "./components/icons/ArrowIcon";
import { getCurrentUser, onAuthStateChange, supabase } from "./utils/supabase";
import DashboardView from "./components/DashboardView";
import Sidebar from "./components/Sidebar";
import AudioRecordingView from "./components/AudioRecordingView";
import YouTubeView from "./components/YouTubeView";
import DocumentView from "./components/DocumentView";
import NotesEditorView from "./components/NotesEditorView";
import QuizView from "./components/QuizView";
import MatchGame from "./components/MatchGame";
import SubjectPromptModal from "./components/SubjectPromptModal";

// Custom SVG Icons for landing page (replacing emojis)
const EditNoteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="14" y2="17"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

type ViewMode = "home" | "input" | "createFlow" | "dashboard" | "studying" | "saved" | "settings" | "audio" | "youtube" | "document" | "notes" | "quiz" | "match" | "pricing" | "tips" | "about";
type MaterialType = "notes" | "audio" | "document" | "youtube" | null;

export default function Home() {
  const router = useRouter();
  const t = useTranslation();
  const { settings } = useSettings();
  const { profile, needsOnboarding, isLoading: personalizationLoading, getPersonalizedGreeting, getSubjectDisplay, daysUntilExam } = usePersonalization();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const [currentGrade, setCurrentGrade] = useState<string>("");
  const [savedSets, setSavedSets] = useState<FlashcardSet[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [remainingStudySets, setRemainingStudySets] = useState(3);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState<MaterialType>(null);
  const [pendingTranscription, setPendingTranscription] = useState<{ text: string; subject: string } | null>(null);
  const [pendingExtraction, setPendingExtraction] = useState<{ text: string; subject: string; title: string } | null>(null);
  
  // Quiz and Match game state
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [matchTerms, setMatchTerms] = useState<string[]>([]);
  const [matchDefinitions, setMatchDefinitions] = useState<string[]>([]);
  const [quizSubject, setQuizSubject] = useState<string>("");
  
  // Subject prompt modal state
  const [showSubjectPrompt, setShowSubjectPrompt] = useState(false);
  const [pendingView, setPendingView] = useState<"notes" | "audio" | "document" | "youtube" | null>(null);
  const [initialSubject, setInitialSubject] = useState<string>("");
  
  // Navigation history for proper back button behavior
  const navigationHistory = useRef<ViewMode[]>([]);

  // Helper to navigate with history tracking
  const navigateTo = (view: ViewMode, url?: string) => {
    navigationHistory.current.push(viewMode);
    setViewMode(view);
    if (url) window.history.pushState({}, '', url);
  };

  // Helper to go back properly
  const goBack = () => {
    const previousView = navigationHistory.current.pop();
    if (previousView) {
      setViewMode(previousView);
      // Update URL based on view
      const urlMap: Record<ViewMode, string> = {
        home: '/',
        dashboard: '/dashboard',
        createFlow: '/create',
        studying: '/study',
        saved: '/saved',
        settings: '/settings',
        audio: '/audio',
        youtube: '/youtube',
        document: '/document',
        input: '/input',
        pricing: '/pricing',
        tips: '/tips',
        about: '/about',
        notes: '/notes',
        quiz: '/quiz',
        match: '/match'
      };
      window.history.pushState({}, '', urlMap[previousView] || '/');
    } else if (user) {
      setViewMode('dashboard');
      window.history.pushState({}, '', '/dashboard');
    } else {
      setViewMode('home');
      window.history.pushState({}, '', '/');
    }
  };

  // Check URL params for view on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam === 'create') {
      // Only redirect to dashboard if user is logged in
      if (user) {
        setViewMode('dashboard');
      }
      // Clean the URL
      window.history.replaceState({}, '', '/');
    } else if (viewParam === 'audio' && user) {
      setViewMode('audio');
      window.history.replaceState({}, '', '/');
    } else if (viewParam === 'youtube' && user) {
      setViewMode('youtube');
      window.history.replaceState({}, '', '/');
    } else if (viewParam === 'dashboard' && user) {
      setViewMode('dashboard');
      window.history.replaceState({}, '', '/');
    }
  }, [user]);

  // Auto-redirect logged in users to dashboard (only on login, not manual navigation)
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (user && viewMode === 'home' && !hasRedirected.current) {
      hasRedirected.current = true;
      setViewMode('dashboard');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [user, viewMode]);

  // Onboarding redirect removed - users see landing page first
  // Personalization is handled inline on the dashboard instead

  // Check cookie consent for analytics
  useEffect(() => {
    const consent = getCookieConsent();
    setAnalyticsEnabled(consent === "accepted");
    
    // Listen for consent changes
    const handleConsentChange = (e: CustomEvent) => {
      setAnalyticsEnabled(e.detail.accepted);
    };
    
    window.addEventListener('cookieConsentChanged', handleConsentChange as EventListener);
    return () => window.removeEventListener('cookieConsentChanged', handleConsentChange as EventListener);
  }, []);

  // Load saved sets after hydration
  useEffect(() => {
    const loadSavedSets = async () => {
      const sets = await getSavedFlashcardSets();
      setSavedSets(sets);
      
      // Update remaining study sets for free users
      if (!isPremium) {
        const MAX_STUDY_SETS = 2;
        const remaining = Math.max(0, MAX_STUDY_SETS - sets.length);
        setRemainingStudySets(remaining);
      }
    };
    loadSavedSets();
  }, [viewMode, isPremium]); // Reload when view changes or premium status changes

  // Check for Premium purchase success and activate
  useEffect(() => {
    const checkPremiumSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const premiumStatus = urlParams.get('premium');
      
      if (premiumStatus === 'success' && user && supabase) {
        console.log('[Premium] Payment success detected - activating Premium...');
        
        try {
          // Get session token
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('[Premium] No session found');
            return;
          }

          // Call activation endpoint
          const response = await fetch('/api/premium/activate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[Premium] ✅ Premium activated:', data);
            setIsPremium(true);
            
            // Remove the URL parameter
            window.history.replaceState({}, '', '/');
            
            // CRITICAL: Notify CreateFlowView to re-check premium status immediately
            const event = new CustomEvent('premiumStatusChanged', { detail: { isPremium: true } });
            window.dispatchEvent(event);
            console.log('[Premium] 📢 Dispatched premiumStatusChanged event');
            
            // Show success toast
            setToast({ 
              message: 'Premium activated! All features are now unlocked.',
              type: 'success' 
            });
            
            // Refresh the page after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            console.error('[Premium] Activation failed:', await response.text());
            // Webhook might still activate, show info toast
            setToast({ 
              message: 'Payment received! Your premium account will be activated shortly.',
              type: 'info' 
            });
          }
        } catch (error) {
          console.error('[Premium] Activation error:', error);
          // Don't show error - webhook will handle it
        }
      }
    };
    
    checkPremiumSuccess();
  }, [user]);

  // Handle OAuth success redirect - refresh auth state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    const verified = urlParams.get('verified');
    
    if (authSuccess === 'success') {
      console.log('[Auth] OAuth callback detected - refreshing session...');
      // Clear the params
      window.history.replaceState({}, '', '/');
      
      // Show welcome message if verified
      if (verified === 'true') {
        setToast({
          message: '✅ Email verified! Welcome to StudyMaxx. You\'re all set!',
          type: 'success'
        });
      }
      
      // Force Supabase to refresh the session from cookies
      if (supabase) {
        supabase.auth.refreshSession().then(() => {
          console.log('[Auth] Session refreshed after OAuth callback');
          // This will trigger onAuthStateChange listener
        }).catch(error => {
          console.error('[Auth] Failed to refresh session:', error);
          // Fallback: reload the page to force fresh auth check
          setTimeout(() => window.location.reload(), 500);
        });
      }
    }
  }, []);

  // Check auth status
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Check if user is owner
      const isOwnerUser = currentUser?.email === 'studymaxxer@gmail.com';
      setIsOwner(isOwnerUser);
      
      if (currentUser && supabase) {
        // Sync user to database
        try {
          await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              email: currentUser.email,
            }),
          });
        } catch (error) {
          console.error('Failed to sync user:', error);
        }

        // Get premium status using API (bypasses RLS with service role key)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const premiumResponse = await fetch('/api/premium/check', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            const premiumData = await premiumResponse.json();
            const isPremium = premiumData.isPremium || isOwnerUser;
            console.log('[Page] Premium status from API (initial load):', isPremium);
            setIsPremium(isPremium);
          }
        } catch (error) {
          console.error('[Page] Error checking premium:', error);
          setIsPremium(isOwnerUser);
        }
      }
    };
    
    loadUser();
    const unsubscribe = onAuthStateChange((newUser) => {
      setUser(newUser);
      const isOwnerUser = newUser?.email === 'studymaxxer@gmail.com';
      setIsOwner(isOwnerUser);
      if (newUser && supabase) {
        // Sync user to database
        fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: newUser.id,
            email: newUser.email,
          }),
        }).catch(console.error);

        // Get premium status using API (bypasses RLS with service role key)
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            fetch('/api/premium/check', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
              .then(res => res.json())
              .then(data => {
                const isPremium = data.isPremium || isOwnerUser;
                console.log('[Page] Premium status from API:', isPremium);
                setIsPremium(isPremium);
              })
              .catch(err => {
                console.error('[Page] Error checking premium:', err);
                setIsPremium(isOwnerUser);
              });
          }
        });
      } else {
        setIsPremium(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for custom events from other components
  useEffect(() => {
    const handleShowLogin = () => handleOpenLoginModal();
    const handleShowPremium = () => { window.location.href = '/pricing'; };

    window.addEventListener('showLogin', handleShowLogin);
    window.addEventListener('showPremium', handleShowPremium);

    return () => {
      window.removeEventListener('showLogin', handleShowLogin);
      window.removeEventListener('showPremium', handleShowPremium);
    };
  }, []);

  const handleGenerateFlashcards = (cards: Flashcard[], subject?: string, grade?: string) => {
    setFlashcards(cards);
    setCurrentSetId(null);
    if (subject) setCurrentSubject(subject);
    if (grade) setCurrentGrade(grade);
    navigateTo("studying", "/study");
  };

  const handleLoadSet = (cards: Flashcard[], setId: string) => {
    setFlashcards(cards);
    setCurrentSetId(setId);
    updateLastStudied(setId);
    navigateTo("studying", "/study");
  };

  const handleBackToInput = () => {
    goBack();
    setFlashcards([]);
    setCurrentSetId(null);
  };

  const handleBackToHome = () => {
    goBack();
    setFlashcards([]);
    setCurrentSetId(null);
  };

  const handleViewSavedSets = () => {
    navigateTo("saved", "/saved");
  };

  const handleCreateNew = () => {
    // Require login to access dashboard
    if (!user) {
      handleOpenLoginModal();
      return;
    }
    navigateTo("dashboard", "/dashboard");
  };

  const handleGoToCreate = (option?: "notes" | "audio" | "document" | "youtube") => {
    // Route to dedicated views for audio, youtube, document, and notes
    // But first show subject prompt modal
    if (option === "audio" || option === "youtube" || option === "document" || option === "notes") {
      setPendingView(option);
      setShowSubjectPrompt(true);
      return;
    }
    // Set the material type so CreateFlowView can pre-select it
    setSelectedMaterialType(option || null);
    navigateTo("createFlow", "/create");
  };

  const handleViewSettings = () => {
    navigateTo("settings", "/settings");
  };

  // Sync URL with viewMode
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/create') {
        setViewMode('createFlow');
      } else if (path === '/dashboard') {
        setViewMode('dashboard');
      } else if (path === '/saved') {
        setViewMode('saved');
      } else if (path === '/settings') {
        setViewMode('settings');
      } else if (path === '/audio') {
        setViewMode('audio');
      } else if (path === '/youtube') {
        setViewMode('youtube');
      } else if (path === '/document') {
        setViewMode('document');
      } else if (path === '/pricing') {
        window.location.href = '/pricing';
      } else if (path === '/' || path === '') {
        // If user is logged in, go to dashboard. Otherwise, go to home.
        if (user) {
          setViewMode('dashboard');
          window.history.replaceState({}, '', '/dashboard');
        } else {
          setViewMode('home');
        }
      } else {
        // Unknown path - redirect appropriately
        if (user) {
          setViewMode('dashboard');
          window.history.replaceState({}, '', '/dashboard');
        } else {
          setViewMode('home');
          window.history.replaceState({}, '', '/');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Determine if dark mode should be applied
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Track scroll position before login modal opens and restore after close
  const scrollPositionRef = useRef(0);
  const handleOpenLoginModal = () => {
    scrollPositionRef.current = window.scrollY;
    setShowLoginModal(true);
  };
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    // Restore scroll position after modal closes
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  };

  return (
    <main className={`min-h-screen relative ${isDarkMode ? 'homepage-dark' : ''}`} style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
      {/* Only load analytics if user accepted cookies */}
      {analyticsEnabled && <Analytics />}
      {viewMode === "home" && (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>
          {/* Background gradient effects - Soft blue accent */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
          </div>

          {/* Top Navigation - NotebookLM Style */}
          <nav className="relative z-50 px-6 py-4 flex justify-between items-center border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
            <div className="flex items-center gap-8">
              <div className="text-2xl font-bold tracking-tight" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                <span style={{ color: '#1a73e8' }}>Study</span>Maxx
              </div>
              <div className="hidden md:flex items-center gap-6">
                <a href="/pricing" style={{ color: '#5f6368' }} className="text-sm hover:text-blue-600 transition-colors">Upgrade to Premium</a>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <button
                    onClick={handleViewSettings}
                    style={{ color: '#5f6368' }}
                    className="px-4 py-2 text-sm hover:text-blue-600 transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: '#1a73e8', 
                      color: '#ffffff',
                    }}
                  >
                    Dashboard
                  </button>
                  <UserProfileDropdown 
                    user={user} 
                    isPremium={isPremium}
                    isOwner={isOwner}
                    onNavigateSettings={handleViewSettings}
                    onUpgradePremium={() => { window.location.href = '/pricing'; }}
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleOpenLoginModal()}
                    className="px-4 py-2 text-sm transition-all duration-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-200 hover:shadow-md hover:brightness-110"
                    style={{ 
                      backgroundColor: '#1a73e8', 
                      color: '#ffffff',
                    }}
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </nav>
          
          {/* Hero Section - NotebookLM Style */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div 
                className="absolute w-72 h-72 rounded-full morphing-blob opacity-20 blur-3xl animate-float"
                style={{ backgroundColor: 'rgba(26, 115, 232, 0.25)', top: '10%', left: '10%' }}
              />
              <div 
                className="absolute w-96 h-96 rounded-full morphing-blob opacity-15 blur-3xl animate-float animation-delay-2000"
                style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', top: '50%', right: '5%' }}
              />
              <div 
                className="absolute w-64 h-64 rounded-full morphing-blob opacity-15 blur-3xl animate-float animation-delay-4000"
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', bottom: '10%', left: '30%' }}
              />
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-center max-w-4xl mb-6 leading-[1.1] animate-fade-in-up animation-delay-100">
              <span style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Stop re-reading.</span>
              <br />
              <span 
                className="bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, #1a73e8, #2563eb, #1a73e8)',
                  backgroundSize: '100% 100%'
                }}
              >
                Start remembering.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-center max-w-2xl mb-10 animate-fade-in-up animation-delay-200" style={{ color: '#5f6368' }}>
              Paste your notes, upload a PDF, or drop a YouTube link — get flashcards and quizzes in seconds. Free.
            </p>

            {/* Primary CTA - NotebookLM Style */}
            <div className="flex flex-col items-center gap-4 mb-8 animate-fade-in-up animation-delay-300">
              <button
                onClick={handleCreateNew}
                className="group px-10 py-5 rounded-full text-lg font-medium transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-100 flex items-center gap-3"
                style={{ 
                  backgroundColor: '#1a73e8',
                  color: '#ffffff',
                }}
              >
                <span>Create Your First Study Set</span>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <p className="text-sm flex items-center gap-2 animate-fade-in-up animation-delay-400" style={{ color: '#5f6368' }}>
                <svg className="w-4 h-4" style={{ color: '#34a853' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required · 2 free sets per day</span>
              </p>
            </div>

            {/* Secondary CTA for logged in users */}
            {user && savedSets.length > 0 && (
              <button
                onClick={handleViewSavedSets}
                className="px-6 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-100 animate-fade-in-up animation-delay-500"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', 
                  color: isDarkMode ? '#e2e8f0' : '#000000', 
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' 
                }}
              >
                My Study Sets ({savedSets.length})
              </button>
            )}

            {/* Social Proof */}
            <div className="flex items-center gap-4 mt-12 mb-16 animate-fade-in-up animation-delay-500">
              <div className="flex -space-x-3">
                {[
                  { color: '#1a73e8', letter: 'J' },
                  { color: '#ea4335', letter: 'M' },
                  { color: '#fbbc04', letter: 'S' },
                  { color: '#34a853', letter: 'K' },
                  { color: '#ff6d01', letter: 'R' }
                ].map((avatar, i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-transform duration-300 hover:scale-110 hover:z-10"
                    style={{ 
                      backgroundColor: avatar.color, 
                      color: '#ffffff', 
                      border: `3px solid ${isDarkMode ? '#1a1a2e' : '#f1f5f9'}`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  >
                    {avatar.letter}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }} className="font-bold">1,000+</span>
                <span style={{ color: '#5f6368' }}> students studying smarter</span>
              </div>
            </div>

            {/* How It Works - NotebookLM Style */}
            <div className="w-full max-w-4xl animate-fade-in-up animation-delay-600">
              <h3 className="text-center text-sm font-medium uppercase tracking-wider mb-8" style={{ color: '#5f6368' }}>
                How it works
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d animate-fade-in-up animation-delay-700" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8' }}>
                    <EditNoteIcon />
                  </div>
                  <div className="text-xs font-bold mb-2 px-2 py-1 rounded-full inline-block" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8' }}>
                    STEP 1
                  </div>
                  <h4 className="font-medium mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Add Your Content</h4>
                  <p className="text-sm" style={{ color: '#5f6368' }}>Take notes, paste text, upload PDFs, or link YouTube videos</p>
                </div>
                
                {/* Step 2 */}
                <div className="text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d animate-fade-in-up animation-delay-800" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(234, 67, 53, 0.1)', color: '#ea4335' }}>
                    <BoltIcon />
                  </div>
                  <div className="text-xs font-bold mb-2 px-2 py-1 rounded-full inline-block" style={{ backgroundColor: 'rgba(234, 67, 53, 0.1)', color: '#ea4335' }}>
                    STEP 2
                  </div>
                  <h4 className="font-medium mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>AI Creates Study Material</h4>
                  <p className="text-sm" style={{ color: '#5f6368' }}>Generate flashcards, quizzes & notes instantly</p>
                </div>
                
                {/* Step 3 */}
                <div className="text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d animate-fade-in-up" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', animationDelay: '0.9s' }}>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(52, 168, 83, 0.1)', color: '#34a853' }}>
                    <TargetIcon />
                  </div>
                  <div className="text-xs font-bold mb-2 px-2 py-1 rounded-full inline-block" style={{ backgroundColor: 'rgba(52, 168, 83, 0.1)', color: '#34a853' }}>
                    STEP 3
                  </div>
                  <h4 className="font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Study & Ace Exams</h4>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Test yourself with cards, quizzes & track progress</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="relative px-6 py-20" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                Everything you need to <span style={{ color: '#1a73e8' }}>ace your exams</span>
              </h2>
              <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                Powerful features designed by students, for students.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(26, 115, 232, 0.05)', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(26, 115, 232, 0.2)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(26, 115, 232, 0.15)' }}>
                    <svg className="w-6 h-6" style={{ color: '#1a73e8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Lightning Fast</h3>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Generate flashcards from any content in seconds. No manual work required.</p>
                </div>
                
                <div className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-105" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                    <svg className="w-6 h-6" style={{ color: isDarkMode ? '#ffffff' : '#000000' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Smart Quizzes</h3>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Test yourself with auto-generated multiple choice questions and track progress.</p>
                </div>
                
                <div className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-105" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                    <svg className="w-6 h-6" style={{ color: isDarkMode ? '#ffffff' : '#000000' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Any Format</h3>
                  <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Upload PDFs, images, paste text, or link YouTube videos. We handle it all.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="relative px-6 py-20" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
            <div className="max-w-4xl mx-auto">
              {isPremium && user ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-bounce-in" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', border: '2px solid #1a73e8' }}>
                    <svg className="w-5 h-5" style={{ color: '#1a73e8' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span style={{ color: '#1a73e8' }} className="font-medium">Premium Active</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>You're all set!</h2>
                  <p className="mb-8" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Enjoy unlimited study sets and all premium features.</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)', border: '2px solid #1a73e8' }}>
                      <span style={{ color: '#1a73e8' }} className="font-medium">🎓 Premium Plan</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                      Unlock <span style={{ color: '#1a73e8' }}>everything</span> for $8.99/mo
                    </h2>
                    <p style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Or save 26% with the annual plan at $79.99/year.</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Free Plan */}
                    <div className="p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.1)' }}>
                      <h3 className="text-xl font-bold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Free</h3>
                      <p className="text-sm mb-6" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Perfect for trying out</p>
                      <div className="text-4xl font-bold mb-6" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>$0</div>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>2 study sets per day</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Paste notes</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>All study modes</span>
                        </li>
                      </ul>
                      <button
                        onClick={handleCreateNew}
                        className="w-full py-3 px-6 font-medium rounded-xl transition-all duration-300 hover:scale-105 active:scale-100"
                        style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#ffffff' : '#000000', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}
                      >
                        Get Started Free
                      </button>
                    </div>

                    {/* Premium Plan */}
                    <div className="p-8 rounded-2xl relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(26, 115, 232, 0.05)' : 'rgba(26, 115, 232, 0.05)', border: '2px solid #1a73e8', zIndex: 10 }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}>
                          MOST POPULAR
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Premium</h3>
                      <p className="text-sm mb-6" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>For serious students</p>
                      <div className="mb-6">
                        <span className="text-4xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>$8.99</span>
                        <span style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>/month</span>
                      </div>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#1a73e8' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span><strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Unlimited</strong> study sets</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#1a73e8' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>PDF & image uploads</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#1a73e8' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Priority AI processing</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#1a73e8' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Cross-device sync</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => {
                          if (!user) {
                            handleOpenLoginModal();
                          } else {
                            window.location.href = '/pricing';
                          }
                        }}
                        className="w-full py-3 px-6 font-semibold rounded-xl transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100"
                        style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}
                      >
                        Get Premium
                      </button>
                      <p className="text-center text-xs mt-3" style={{ color: '#5f6368' }}>Cancel anytime · No commitment</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Final CTA Section */}
          {!isPremium && (
            <div className="relative px-6 py-20" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                  Your next exam is closer than you think.
                </h2>
                <p className="text-lg mb-8" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  Students using active recall score 50% higher. Start studying smarter now — it takes 30 seconds.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="group px-10 py-5 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-100"
                  style={{ 
                    backgroundColor: '#1a73e8', 
                    color: '#ffffff'
                  }}
                >
                  <span>Get Started — It's Free</span>
                  <svg className="w-6 h-6 inline-block ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="relative px-6 py-8" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>© 2026 StudyMaxx</div>
              <div className="flex items-center gap-6 text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                <a href="/pricing" className="hover:text-blue-500 transition-colors">Upgrade to Premium</a>
                <a href="/help" className="hover:text-blue-500 transition-colors">Help</a>
                <a href="/privacy" className="hover:text-blue-500 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-blue-500 transition-colors">Terms</a>
              </div>
            </div>
          </footer>
        </div>
      )}
      
      {viewMode === "input" && (
        <InputView 
          onGenerateFlashcards={handleGenerateFlashcards}
          onViewSavedSets={handleViewSavedSets}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "dashboard" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              } else if (view === 'tips' || view === 'about') {
                // These are now handled via external pages or modals
                window.location.href = `/${view}`;
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <DashboardView
            onSelectOption={handleGoToCreate}
            onCreateFlashcards={() => handleGoToCreate("notes")}
            onLoadSet={handleLoadSet}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            user={user}
            onBack={goBack}
            onSettings={handleViewSettings}
            savedSets={savedSets}
          />
        </>
      )}
      {viewMode === "createFlow" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <CreateFlowView
            onGenerateFlashcards={handleGenerateFlashcards}
            onBack={goBack}
            onRequestLogin={() => handleOpenLoginModal()}
            initialMaterialType={selectedMaterialType}
            initialText={pendingTranscription?.text || pendingExtraction?.text}
            initialSubject={pendingTranscription?.subject || pendingExtraction?.subject}
          />
        </>
      )}
      {viewMode === "studying" && (
        <StudyView 
          flashcards={flashcards}
          currentSetId={currentSetId}
          onBack={goBack}
          isPremium={isPremium}
        />
      )}
      {viewMode === "audio" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <AudioRecordingView
            onBack={goBack}
            onTranscriptionComplete={(text, subject) => {
              setPendingTranscription({ text, subject });
              setViewMode('notes');
              window.history.pushState({}, '', '/notes');
            }}
            onGenerateFlashcards={handleGenerateFlashcards}
            onGenerateQuiz={(questions, subject) => {
              setQuizQuestions(questions);
              setCurrentSubject(subject);
              setViewMode('quiz');
              window.history.pushState({}, '', '/quiz');
            }}
            onGenerateMatch={(terms, definitions, subject) => {
              setMatchTerms(terms);
              setMatchDefinitions(definitions);
              setCurrentSubject(subject);
              setViewMode('match');
              window.history.pushState({}, '', '/match');
            }}
            isPremium={isPremium}
            user={user}
            initialSubject={initialSubject}
          />
        </>
      )}
      {viewMode === "youtube" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <YouTubeView
            onBack={goBack}
            onContentExtracted={(text, subject, title) => {
              setPendingExtraction({ text, subject, title });
              setSelectedMaterialType('notes');
              setViewMode('createFlow');
              window.history.pushState({}, '', '/create');
            }}
            onGenerateFlashcards={handleGenerateFlashcards}
            onGenerateQuiz={(questions, subject) => {
              setQuizQuestions(questions);
              setCurrentSubject(subject);
              setViewMode('quiz');
              window.history.pushState({}, '', '/quiz');
            }}
            onGenerateMatch={(terms, definitions, subject) => {
              setMatchTerms(terms);
              setMatchDefinitions(definitions);
              setCurrentSubject(subject);
              setViewMode('match');
              window.history.pushState({}, '', '/match');
            }}
            isPremium={isPremium}
            user={user}
            initialSubject={initialSubject}
          />
        </>
      )}
      {viewMode === "document" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <DocumentView
            onBack={goBack}
            onGenerateFlashcards={handleGenerateFlashcards}
            isPremium={isPremium}
            user={user}
            initialSubject={initialSubject}
          />
        </>
      )}
      {viewMode === "notes" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <NotesEditorView
            onBack={goBack}
            onGenerateFlashcards={handleGenerateFlashcards}
            onGenerateQuiz={(questions, subject) => {
              setQuizQuestions(questions);
              setQuizSubject(subject);
              setViewMode("quiz");
            }}
            onGenerateMatch={(terms, definitions, subject) => {
              setMatchTerms(terms);
              setMatchDefinitions(definitions);
              setQuizSubject(subject);
              setViewMode("match");
            }}
            isPremium={isPremium}
            user={user}
            initialText={pendingTranscription?.text || pendingExtraction?.text || ""}
            initialSubject={pendingTranscription?.subject || pendingExtraction?.subject || initialSubject || ""}
          />
        </>
      )}
      {viewMode === "saved" && (
        <SavedSetsView 
          onLoadSet={handleLoadSet}
          onBack={goBack}
        />
      )}
      {viewMode === "settings" && (
        <>
          <Sidebar
            currentView="settings"
            onNavigate={(view) => {
              if (view === 'dashboard') {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              } else if (view === 'settings') {
                setViewMode('settings');
                window.history.pushState({}, '', '/settings');
              } else if (view === 'pricing') {
                window.location.href = '/pricing';
              }
            }}
            onSignOut={async () => {
              if (supabase) {
                await supabase.auth.signOut();
                setUser(null);
                setIsPremium(false);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
              }
            }}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
          />
          <SettingsView 
            onBack={() => {
              setViewMode('dashboard');
              window.history.pushState({}, '', '/dashboard');
            }}
          />
        </>
      )}

      {/* Quiz View */}
      {viewMode === "quiz" && quizQuestions.length > 0 && (
        <QuizView
          questions={quizQuestions}
          subject={quizSubject}
          onBack={() => setViewMode("notes")}
        />
      )}

      {/* Match Game */}
      {viewMode === "match" && matchTerms.length > 0 && (
        <MatchGame
          terms={matchTerms}
          definitions={matchDefinitions}
          subject={quizSubject}
          onBack={() => setViewMode("notes")}
        />
      )}

      {/* Modals - rendered at all times, not just in home view */}
      {showLoginModal && (
        <LoginModal 
          onClose={handleCloseLoginModal}
          onSkip={handleCloseLoginModal}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Subject Prompt Modal */}
      <SubjectPromptModal
        isOpen={showSubjectPrompt}
        onClose={() => {
          setShowSubjectPrompt(false);
          setPendingView(null);
        }}
        onSubmit={(subject) => {
          setInitialSubject(subject);
          setShowSubjectPrompt(false);
          
          // Navigate to the pending view
          if (pendingView === "audio") {
            navigateTo("audio", "/audio");
          } else if (pendingView === "youtube") {
            navigateTo("youtube", "/youtube");
          } else if (pendingView === "document") {
            navigateTo("document", "/document");
          } else if (pendingView === "notes") {
            navigateTo("notes", "/notes");
          }
          setPendingView(null);
        }}
      />
    </main>
  );
}

