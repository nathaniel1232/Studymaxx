"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/next";
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
import Sidebar from "./components/Sidebar";
import PremiumModal from "./components/PremiumModal";

// Lazy load heavy components that aren't needed on initial render
const CreateFlowView = dynamic(() => import("./components/CreateFlowView"), { ssr: false });
const StudyView = dynamic(() => import("./components/StudyViewNew"), { ssr: false });
const SavedSetsView = dynamic(() => import("./components/SavedSetsView"), { ssr: false });
const SettingsView = dynamic(() => import("./components/SettingsView"), { ssr: false });
const DashboardView = dynamic(() => import("./components/DashboardView"), { ssr: false });
const AudioRecordingView = dynamic(() => import("./components/AudioRecordingView"), { ssr: false });
const YouTubeView = dynamic(() => import("./components/YouTubeView"), { ssr: false });
const DocumentView = dynamic(() => import("./components/DocumentView"), { ssr: false });
const NotesEditorView = dynamic(() => import("./components/NotesEditorView"), { ssr: false });
const QuizView = dynamic(() => import("./components/QuizView"), { ssr: false });
const MatchGame = dynamic(() => import("./components/MatchGame"), { ssr: false });
const SubjectPromptModal = dynamic(() => import("./components/SubjectPromptModal"), { ssr: false });
const MathMaxxView = dynamic(() => import("./components/MathMaxxView"), { ssr: false });
const SummarizerView = dynamic(() => import("./components/SummarizerView"), { ssr: false });

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

type ViewMode = "home" | "createFlow" | "dashboard" | "studying" | "saved" | "settings" | "audio" | "youtube" | "document" | "notes" | "quiz" | "match" | "pricing" | "tips" | "about" | "mathmaxx" | "summarizer";
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
  const [premiumCheckCount, setPremiumCheckCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'signin' | 'signup'>('signin');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [landingBillingInterval, setLandingBillingInterval] = useState<'month' | 'year'>('month');
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
  
  // Carousel state for testimonials
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Review data
  const reviews = [
    {
      stars: "★★★★☆",
      quote: "Making flashcards by hand used to take me forever. This is way faster. I uploaded my chem chapter and the quiz it made was pretty good ngl.",
      author: "Marcus T.",
      initials: "M",
      color: "#1a73e8",
      flag: "🇩🇪",
      location: "High school student",
    },
    {
      stars: "★★★★★",
      quote: "maths was just not clicking for me. used the mathmaxx thing to ask questions while i was going through my notes and it finally made sense. 18/20 on the test",
      author: "Alex R.",
      initials: "A",
      color: "#f97316",
      flag: "🇬🇷",
      location: "High school student",
    },
    {
      stars: "★★★★★",
      quote: "Had a bio exam the next day with like 40 pages of notes. Uploaded them and got flashcards in under a minute. Actually worked lol",
      author: "Emma K.",
      initials: "E",
      color: "#06b6d4",
      flag: "🇬🇧",
      location: "Med student",
    },
    {
      stars: "★★★★★",
      quote: "i was completely fried going into finals week. saw this on tiktok and it honestly saved me. did 3 exams in 2 days and passed all of them when i thought i was cooked",
      author: "Rey",
      initials: "R",
      color: "#a855f7",
      flag: "🇨🇦",
      location: "Sophomore",
    },
    {
      stars: "★★★★★",
      quote: "been using quizlet for years but this is actually better for understanding stuff. the way it turns a lecture pdf into actual questions you have to think about is different",
      author: "Jess M.",
      initials: "J",
      color: "#10b981",
      flag: "🇦🇺",
      location: "Uni student",
    },
    {
      stars: "★★★★☆",
      quote: "my history notes are always a mess but i pasted them in and it gave me proper flashcards. lost a couple details but 90% of it was right and saved me like 2 hours",
      author: "Liam B.",
      initials: "L",
      color: "#e11d48",
      flag: "🇮🇪",
      location: "A-Level student",
    },
  ];
  
  // Carousel handlers
  const handleCarouselPrev = () => {
    setCarouselIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };
  
  const handleCarouselNext = () => {
    setCarouselIndex((prev) => (prev + 1) % reviews.length);
  };
  
  // Navigation history for proper back button behavior
  const navigationHistory = useRef<ViewMode[]>([]);

  // Helper to navigate with history tracking
  const navigateTo = (view: ViewMode, url?: string) => {
    navigationHistory.current.push(viewMode);
    setViewMode(view);
    if (url) window.history.pushState({}, '', url);
  };

  // Shared sidebar navigation handler
  const handleSidebarNavigate = (view: string) => {
    if (view === 'dashboard') {
      setViewMode('dashboard');
      window.history.pushState({}, '', '/dashboard');
    } else if (view === 'settings') {
      setViewMode('settings');
      window.history.pushState({}, '', '/settings');
    } else if (view === 'pricing') {
      setShowPremiumModal(true);
    } else if (view === 'audio') {
      setViewMode('audio');
      window.history.pushState({}, '', '/audio');
    } else if (view === 'summarizer') {
      setViewMode('summarizer');
      window.history.pushState({}, '', '/summarizer');
    } else if (view === 'tips' || view === 'about') {
      window.location.href = `/${view}`;
    }
  };

  // Shared sidebar sign out handler
  const handleSidebarSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setIsPremium(false);
      setViewMode('home');
      window.history.replaceState({}, '', '/');
    }
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
        pricing: '/pricing',
        tips: '/tips',
        about: '/about',
        notes: '/notes',
        quiz: '/quiz',
        match: '/match',
        mathmaxx: '/mathmaxx',
        summarizer: '/summarizer'
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
    // Handle ?signin=true redirect from pricing page when user isn't logged in
    if (urlParams.get('signin') === 'true') {
      window.history.replaceState({}, '', '/');
      sessionStorage.setItem('returnAfterLogin', '/');
      setShowLoginModal(true);
      setLoginModalMode('signin');
      return;
    }
    // Handle ?upgrade=true to show premium modal
    if (urlParams.get('upgrade') === 'true') {
      window.history.replaceState({}, '', user ? '/dashboard' : '/');
      if (user) setViewMode('dashboard');
      setShowPremiumModal(true);
      return;
    }
    const viewParam = urlParams.get('view');
    if (viewParam === 'create' || viewParam === 'createFlow') {
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
    } else if (viewParam === 'summarizer' && user) {
      setViewMode('summarizer');
      window.history.replaceState({}, '', '/summarizer');
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

  // Refresh premium status when navigating to dashboard
  useEffect(() => {
    if (viewMode === 'dashboard' && user) {
      console.log('[Premium] Dashboard loaded - refreshing premium status...');
      console.log('[Premium] Current isPremium state:', isPremium);
      setTimeout(async () => {
        const changed = await forceRefreshPremium();
        console.log('[Premium] Force refresh completed. Changed:', changed);
      }, 500);
    }
  }, [viewMode, user, isPremium]);

  // Check for Premium purchase success and activate
  useEffect(() => {
    const checkPremiumSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const premiumStatus = urlParams.get('premium');
      
      if (premiumStatus === 'success' && user && supabase) {
        console.log('[Premium] Payment success detected - forcing premium refresh...');
        
        // Remove the URL parameter immediately
        window.history.replaceState({}, '', '/');
        
        try {
          // Get session token
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('[Premium] No session found');
            return;
          }

          // Try activation endpoint first (fast path)
          const activateResponse = await fetch('/api/premium/activate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (activateResponse.ok) {
            console.log('[Premium] ✅ Activation endpoint succeeded');
          } else {
            console.warn('[Premium] Activation endpoint failed, will check status instead');
          }

          // ALWAYS check premium status from API (most reliable)
          const checkResponse = await fetch('/api/premium/check', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (checkResponse.ok) {
            const data = await checkResponse.json();
            console.log('[Premium] Premium check result:', data.isPremium);
            
            if (data.isPremium) {
              setIsPremium(true);
              
              // Notify all components
              const event = new CustomEvent('premiumStatusChanged', { detail: { isPremium: true } });
              window.dispatchEvent(event);
              
              // Show success toast
              setToast({ 
                message: 'Premium activated! All features unlocked.',
                type: 'success' 
              });
              
              // Force full reload to refresh all components
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1500);
            } else {
              // Premium not active yet, show waiting message
              setToast({ 
                message: 'Payment received! Activating premium... (refresh in 10 seconds)',
                type: 'info' 
              });
              
              // Retry after 10 seconds
              setTimeout(() => {
                window.location.reload();
              }, 10000);
            }
          } else {
            console.error('[Premium] Check failed');
            setToast({ 
              message: 'Payment received! Please refresh the page in a moment.',
              type: 'info' 
            });
          }
        } catch (error) {
          console.error('[Premium] Error:', error);
          setToast({ 
            message: 'Payment successful! Please refresh the page.',
            type: 'info' 
          });
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

  // Force refresh premium status function
  const forceRefreshPremium = async () => {
    if (!user || !supabase) {
      console.log('[Premium Refresh] No user or supabase');
      return false;
    }

    try {
      console.log(`[Premium Refresh] Forcing premium check... (attempt ${premiumCheckCount + 1})`);
      setPremiumCheckCount(c => c + 1);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[Premium Refresh] No session');
        return false;
      }

      const response = await fetch('/api/premium/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newIsPremium = data.isPremium || isOwner;
        console.log(`[Premium Refresh] Result: ${newIsPremium} (was: ${isPremium})`);
        
        if (newIsPremium !== isPremium) {
          console.log('[Premium Refresh] 🔄 Premium status changed!');
          setIsPremium(newIsPremium);
          
          // Notify all components
          const event = new CustomEvent('premiumStatusChanged', { detail: { isPremium: newIsPremium } });
          window.dispatchEvent(event);
          
          return true;
        }
        return false;
      } else {
        console.error('[Premium Refresh] API returned error:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[Premium Refresh] Error:', error);
      return false;
    }
  };

  // Listen for force refresh events from anywhere
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log('[Premium] Force refresh requested');
      forceRefreshPremium();
    };
    
    window.addEventListener('forceRefreshPremium', handleForceRefresh);
    return () => window.removeEventListener('forceRefreshPremium', handleForceRefresh);
  }, [user, isPremium]);

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
            console.log('[Page] Full premium data:', premiumData);
            setIsPremium(isPremium);
            
            // Also refresh premium every time user navigates to dashboard
            // This ensures premium is always up-to-date
            setTimeout(() => {
              forceRefreshPremium();
            }, 2000);
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
        // If user just logged in and was redirected from pricing, go back there
        const returnTo = sessionStorage.getItem('returnAfterLogin');
        if (returnTo) {
          sessionStorage.removeItem('returnAfterLogin');
          window.location.href = returnTo;
          return;
        }
        // If user just signed up from the demo section, restore the demo text
        const demoText = sessionStorage.getItem('demoText');
        if (demoText) {
          sessionStorage.removeItem('demoText');
          setPendingTranscription({ text: demoText, subject: '' });
          setSelectedMaterialType('notes');
          navigateTo('createFlow', '/create');
        }
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
    const handleShowPremium = () => { 
      // Never show premium popup to premium users
      if (!isPremium) {
        setShowPremiumModal(true); 
      }
    };

    window.addEventListener('showLogin', handleShowLogin);
    window.addEventListener('showPremium', handleShowPremium);

    return () => {
      window.removeEventListener('showLogin', handleShowLogin);
      window.removeEventListener('showPremium', handleShowPremium);
    };
  }, [isPremium]);

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

  const handleBackToHome = () => {
    goBack();
    setFlashcards([]);
    setCurrentSetId(null);
  };

  const handleViewSavedSets = () => {
    navigateTo("saved", "/saved");
  };

  const handleCreateNew = () => {
    // Everyone goes to the dashboard — guests can browse and try creating once.
    // The login gate fires when they click "Create Study Set" inside the dashboard.
    navigateTo("dashboard", "/dashboard");
  };

  const handleGoToCreate = (option?: "notes" | "audio" | "document" | "youtube" | "mathmaxx") => {
    // Handle MathMaxx
    if (option === "mathmaxx") {
      setViewMode('mathmaxx');
      window.history.pushState({}, '', '/mathmaxx');
      return;
    }
    
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
        setShowPremiumModal(true);
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

  // Dynamic sidebar margin class
  const sidebarMarginClass = sidebarCollapsed ? 'md:ml-16' : 'md:ml-64';

  // Track scroll position before login modal opens and restore after close
  const scrollPositionRef = useRef(0);
  const handleOpenLoginModal = () => {
    scrollPositionRef.current = window.scrollY;
    setLoginModalMode('signin');
    setShowLoginModal(true);
  };
  
  const handleOpenSignUpModal = () => {
    scrollPositionRef.current = window.scrollY;
    setLoginModalMode('signup');
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
                <span style={{ color: '#06b6d4' }}>Study</span>Maxx
              </div>
              <div className="hidden md:flex items-center gap-6">
                {!isPremium && (
                  <button onClick={() => setShowPremiumModal(true)} style={{ color: '#5f6368' }} className="text-sm hover:text-blue-600 transition-colors">Upgrade to Premium</button>
                )}
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
                      backgroundColor: '#06b6d4', 
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
                    onUpgradePremium={() => { setShowPremiumModal(true); }}
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
                      backgroundColor: '#06b6d4', 
                      color: '#ffffff',
                    }}
                  >
                    Try It Now
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
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.25)', top: '10%', left: '10%' }}
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
              <span style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>Turn anything into</span>
              <br />
              <span style={{ color: '#06b6d4' }}>
                study sets.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-center max-w-2xl mb-3 animate-fade-in-up animation-delay-200" style={{ color: '#5f6368' }}>
              Notes, PDFs, YouTube videos, audio — drop anything in and get flashcards, quizzes, and study material optimized for how your brain actually learns.
            </p>
            <p className="text-base text-center max-w-xl mb-10 animate-fade-in-up animation-delay-200 font-medium" style={{ color: isDarkMode ? '#94a3b8' : '#475569' }}>
              Study less. Remember more.
            </p>

            {/* Primary CTA */}
            <div className="flex flex-col items-center gap-4 mb-8 animate-fade-in-up animation-delay-300">
              <button
                onClick={handleCreateNew}
                className="group px-10 py-5 rounded-full text-lg font-semibold transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-100 flex items-center gap-3"
                style={{ 
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 24px rgba(6,182,212,0.45)'
                }}
              >
                <span>Ascend Your Grades</span>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <p className="text-sm flex items-center gap-2 mt-1" style={{ color: '#5f6368' }}>
                <svg className="w-4 h-4" style={{ color: '#34a853' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card needed · 30 seconds to start</span>
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
            <div className="flex items-center gap-4 mt-6 mb-14 animate-fade-in-up animation-delay-500">
              <div className="flex -space-x-3">
                {[
                  { color: '#06b6d4', letter: 'E' },
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
                    }}
                  >
                    {avatar.letter}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }} className="font-bold">2,000+</span>
                <span style={{ color: '#5f6368' }}> students already studying smarter</span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="w-full max-w-5xl mb-14 animate-fade-in-up animation-delay-500">
              <p className="text-center text-xs font-semibold uppercase tracking-widest mb-7" style={{ color: '#5f6368' }}>What students are saying</p>

              {/* Desktop carousel — arrows + single card */}
              <div className="hidden md:flex items-stretch gap-4">
                {/* Left Arrow */}
                <button
                  onClick={handleCarouselPrev}
                  className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 self-center transition-all duration-200 hover:scale-110 hover:opacity-100 opacity-60"
                  style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }}
                  aria-label="Previous review"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>

                {/* Single active card */}
                <div
                  key={carouselIndex}
                  className="flex-1 p-7 rounded-2xl flex flex-col"
                  style={{
                    background: isDarkMode ? 'rgba(6,182,212,0.07)' : 'rgba(6,182,212,0.05)',
                    border: isDarkMode ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(6,182,212,0.2)',
                  }}
                >
                  <div className="flex gap-0.5 mb-4">
                    {reviews[carouselIndex].stars.split('').map((s, i) => (
                      <span key={i} style={{ color: '#fbbc04', fontSize: '16px' }}>{s}</span>
                    ))}
                  </div>
                  <p className="text-base leading-relaxed mb-6 flex-1" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                    &ldquo;{reviews[carouselIndex].quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: reviews[carouselIndex].color, color: '#fff' }}
                    >
                      {reviews[carouselIndex].initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#000' }}>
                        {reviews[carouselIndex].author}
                      </p>
                      <p className="text-xs flex items-center gap-1" style={{ color: '#5f6368' }}>
                        <span>{reviews[carouselIndex].flag}</span>
                        <span>{reviews[carouselIndex].location}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Arrow */}
                <button
                  onClick={handleCarouselNext}
                  className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 self-center transition-all duration-200 hover:scale-110 hover:opacity-100 opacity-60"
                  style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }}
                  aria-label="Next review"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              {/* Dot indicators (desktop) */}
              <div className="hidden md:flex justify-center gap-2 mt-4">
                {reviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className="h-2 rounded-full transition-all duration-200"
                    style={{
                      width: idx === carouselIndex ? '24px' : '8px',
                      background: idx === carouselIndex ? '#06b6d4' : isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                    }}
                  />
                ))}
              </div>

              {/* Mobile — horizontal scroll */}
              <div
                className="md:hidden flex gap-4 overflow-x-auto pb-3"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {reviews.map((review, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl flex-shrink-0 w-72 flex flex-col"
                    style={{
                      background: isDarkMode ? 'rgba(6,182,212,0.07)' : 'rgba(6,182,212,0.05)',
                      border: isDarkMode ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(6,182,212,0.2)',
                    }}
                  >
                    <div className="flex gap-0.5 mb-3">
                      {review.stars.split('').map((s, i) => <span key={i} style={{ color: '#fbbc04', fontSize: '14px' }}>{s}</span>)}
                    </div>
                    <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                      &ldquo;{review.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: review.color, color: '#fff' }}>
                        {review.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#000' }}>{review.author}</p>
                        <p className="text-xs flex items-center gap-1" style={{ color: '#5f6368' }}>
                          <span>{review.flag}</span>
                          <span>{review.location}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs mt-2 md:hidden" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>â† swipe for more →</p>
            </div>

            {/* Backed by Science - Study Stats */}
            <div className="w-full max-w-5xl mb-14 animate-fade-in-up animation-delay-500">
              <h3 className="text-center text-sm font-medium uppercase tracking-wider mb-8" style={{ color: '#5f6368' }}>
                Backed by research
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { stat: '150%', label: 'better retention with active recall vs rereading', source: 'Karpicke & Blunt, 2011', icon: '🧠' },
                  { stat: '2.5x', label: 'higher exam scores with spaced repetition', source: 'Cepeda et al., 2006', icon: '📈' },
                  { stat: '50%', label: 'less study time needed with flashcard testing', source: 'Roediger & Butler, 2011', icon: '⏱️' },
                  { stat: '90%', label: 'of top students use active recall methods', source: 'Dunlosky et al., 2013', icon: '🏆' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-5 rounded-2xl" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-2xl md:text-3xl font-bold mb-1" style={{ color: '#06b6d4' }}>{item.stat}</div>
                    <p className="text-xs leading-tight mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>{item.label}</p>
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>{item.source}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs mt-4" style={{ color: '#94a3b8' }}>
                StudyMaxx uses these proven techniques — active recall, spaced repetition, and self-testing — so you study less and remember more.
              </p>
            </div>

            {/* How It Works - NotebookLM Style */}
            <div className="w-full max-w-5xl animate-fade-in-up animation-delay-600">
              <h3 className="text-center text-sm font-medium uppercase tracking-wider mb-8" style={{ color: '#5f6368' }}>
                How it works
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d animate-fade-in-up animation-delay-700" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
                    <EditNoteIcon />
                  </div>
                  <div className="text-xs font-bold mb-2 px-2 py-1 rounded-full inline-block" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
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
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                Everything you need to <span style={{ color: '#06b6d4' }}>ace your exams</span>
              </h2>
              <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                Powerful features designed by students, for students.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(6, 182, 212, 0.05)', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-105" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}>
                    <svg className="w-6 h-6" style={{ color: '#06b6d4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="max-w-5xl mx-auto">
              {isPremium && user ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-bounce-in" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '2px solid #06b6d4' }}>
                    <svg className="w-5 h-5" style={{ color: '#06b6d4' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span style={{ color: '#06b6d4' }} className="font-medium">Premium Active</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>You're all set!</h2>
                  <p className="mb-6" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Enjoy unlimited study sets and all premium features.</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
                        const d = await res.json();
                        if (d.url) window.location.href = d.url;
                      } catch {}
                    }}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: isDarkMode ? '#e2e8f0' : '#374151', border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)' }}
                  >
                    Manage Subscription
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                      The plan serious students use
                    </h2>
                    <p className="text-lg" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>When you have more than 2 subjects to study this week.</p>
                  </div>
                  
                  <div className="max-w-lg mx-auto">
                    {/* Premium Plan — Single Card */}
                    <div className="p-8 rounded-2xl relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl card-3d" style={{ backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.03)', border: '2px solid #06b6d4', zIndex: 10 }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: '#06b6d4', color: '#ffffff' }}>
                          MOST POPULAR
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Premium</h3>
                      <p className="text-sm mb-4" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Everything you need to ace your exams</p>
                      
                      {/* Billing Toggle */}
                      <div className="flex justify-center mb-4">
                        <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }}>
                          <button
                            onClick={() => setLandingBillingInterval('month')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${landingBillingInterval === 'month' ? 'shadow-sm' : ''}`}
                            style={{ 
                              backgroundColor: landingBillingInterval === 'month' ? (isDarkMode ? '#1e293b' : '#ffffff') : 'transparent',
                              color: landingBillingInterval === 'month' ? (isDarkMode ? '#ffffff' : '#0f172a') : (isDarkMode ? '#94a3b8' : '#64748b')
                            }}
                          >
                            Monthly
                          </button>
                          <button
                            onClick={() => setLandingBillingInterval('year')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${landingBillingInterval === 'year' ? 'bg-cyan-500 text-white shadow-sm' : ''}`}
                            style={landingBillingInterval !== 'year' ? { color: isDarkMode ? '#94a3b8' : '#64748b' } : undefined}
                          >
                            Yearly
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${landingBillingInterval === 'year' ? 'bg-white/25 text-white' : (isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600')}`}>-26%</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-center mb-5">
                        {landingBillingInterval === 'month' ? (
                          <div>
                            <span className="text-4xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>$5.99</span>
                            <span className="text-base ml-1" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>/month</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-4xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>$4.42</span>
                            <span className="text-base ml-1" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>/month</span>
                            <p className="text-xs mt-1" style={{ color: '#22c55e' }}>Billed $52.99/year · Save $18.89</p>
                          </div>
                        )}
                        <p className="text-xs mt-1" style={{ color: '#22c55e' }}>Less than a coffee a week · Cancel anytime</p>
                      </div>
                      <ul className="space-y-3 mt-5 mb-6">
                        {[
                          { text: "Unlimited study sets, every day", highlight: true },
                          { text: "Up to 75 cards per set", highlight: false },
                          { text: "PDF, images, Word & PowerPoint uploads", highlight: false },
                          { text: "YouTube & audio → flashcards", highlight: false },
                          { text: "AI chat about your material", highlight: false },
                          { text: "Priority AI processing", highlight: false },
                        ].map(item => (
                          <li key={item.text} className="flex items-start gap-3 text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#06b6d4' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>{item.highlight ? <strong>{item.text}</strong> : item.text}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => {
                          if (!user) {
                            handleOpenLoginModal();
                          } else {
                            setShowPremiumModal(true);
                          }
                        }}
                        className="w-full py-3.5 px-6 font-bold rounded-xl transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100"
                        style={{ backgroundColor: '#06b6d4', color: '#ffffff', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}
                      >
                        {landingBillingInterval === 'month' ? 'Get Premium — $5.99/mo' : 'Get Premium — $4.42/mo'}
                      </button>
                      <p className="text-center text-xs mt-3" style={{ color: '#5f6368' }}>Cancel in one click · No commitment</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Final CTA Section */}
          {!isPremium && (
            <div className="relative px-6 py-20" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
              <div className="max-w-5xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                  Your next exam is closer than you think.
                </h2>
                <p className="text-lg mb-6" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  Students using active recall score 50% higher. Join 2,000+ students studying smarter — it takes 30 seconds.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {['Flashcards from any source', 'AI math tutor', 'Smart quizzes', '20+ languages'].map((feature) => (
                    <span key={feature} className="flex items-center gap-1.5 text-sm" style={{ color: isDarkMode ? '#94a3b8' : '#5f6368' }}>
                      <svg className="w-4 h-4" style={{ color: '#06b6d4' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleCreateNew}
                  className="group px-10 py-5 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-100"
                  style={{ 
                    backgroundColor: '#06b6d4', 
                    color: '#ffffff'
                  }}
                >
                  <span>Get Started Now</span>
                  <svg className="w-6 h-6 inline-block ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="relative px-6 py-8" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>© 2026 StudyMaxx</div>
              <div className="flex items-center gap-6 text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                {!isPremium && <button onClick={() => setShowPremiumModal(true)} className="hover:text-blue-500 transition-colors">Upgrade to Premium</button>}
                <a href="/help" className="hover:text-blue-500 transition-colors">Help</a>
                <a href="/privacy" className="hover:text-blue-500 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-blue-500 transition-colors">Terms</a>
              </div>
            </div>
          </footer>
        </div>
      )}
      
      {viewMode === "dashboard" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
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
              onSummarizer={() => { setViewMode('summarizer'); window.history.pushState({}, '', '/summarizer'); }}
              onDeleteSet={async () => { const sets = await getSavedFlashcardSets(); setSavedSets(sets); }}
              onRequestLogin={handleOpenSignUpModal}
            />
          </div>
        </>
      )}
      {viewMode === "createFlow" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
            <CreateFlowView
              onGenerateFlashcards={handleGenerateFlashcards}
              onBack={goBack}
              onRequestLogin={() => handleOpenLoginModal()}
              initialMaterialType={selectedMaterialType}
              initialText={pendingTranscription?.text || pendingExtraction?.text}
              initialSubject={pendingTranscription?.subject || pendingExtraction?.subject}
            />
          </div>
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
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
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
              onRequestLogin={handleOpenSignUpModal}
            />
          </div>
        </>
      )}
      {viewMode === "youtube" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
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
              onRequestLogin={handleOpenSignUpModal}
            />
          </div>
        </>
      )}
      {viewMode === "document" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
            <DocumentView
              onBack={goBack}
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
              onRequestLogin={handleOpenSignUpModal}
            />
          </div>
        </>
      )}
      {viewMode === "notes" && (
        <>
          <Sidebar
            currentView="dashboard"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
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
              onRequestLogin={handleOpenSignUpModal}
            />
          </div>
        </>
      )}
      {viewMode === "saved" && (
        <SavedSetsView 
          onLoadSet={handleLoadSet}
          onBack={goBack}
        />
      )}
      {viewMode === "mathmaxx" && (
        <>
          <Sidebar
            currentView="mathmaxx"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
            <MathMaxxView
              onBack={goBack}
              isPremium={isPremium}
              user={user}
            />
          </div>
        </>
      )}
      {viewMode === "summarizer" && (
        <>
          <Sidebar
            currentView="summarizer"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
            <SummarizerView
              onBack={goBack}
              isPremium={isPremium}
              user={user}
            />
          </div>
        </>
      )}
      {viewMode === "settings" && (
        <>
          <Sidebar
            currentView="settings"
            onNavigate={handleSidebarNavigate}
            onSignOut={handleSidebarSignOut}
            isPremium={isPremium}
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            userEmail={user?.email}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className={`${sidebarMarginClass} transition-all duration-300`}>
            <SettingsView 
              onBack={() => {
                setViewMode('dashboard');
                window.history.pushState({}, '', '/dashboard');
              }}
            />
          </div>
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
          initialMode={loginModalMode}
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

      {/* Premium Modal */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        isPremium={isPremium}
        onRequestLogin={() => {
          setShowPremiumModal(false);
          handleOpenLoginModal();
        }}
      />
    </main>
  );
}

