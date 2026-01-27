"use client";

import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import InputView from "./components/InputView";
import CreateFlowView from "./components/CreateFlowView";
import StudyView from "./components/StudyView";
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
import ArrowIcon from "./components/icons/ArrowIcon";
import { getCurrentUser, onAuthStateChange, supabase } from "./utils/supabase";

type ViewMode = "home" | "input" | "createFlow" | "studying" | "saved" | "settings";

export default function Home() {
  const t = useTranslation();
  const { settings } = useSettings();
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
        const MAX_STUDY_SETS = 3;
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

        // Get premium status
        const { data } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', currentUser.id)
          .single();
        
        setIsPremium(data?.is_premium || isOwnerUser);
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

        // Get premium status
        supabase
          .from('users')
          .select('is_premium')
          .eq('id', newUser.id)
          .single()
          .then(({ data }) => setIsPremium(data?.is_premium || isOwnerUser));
      } else {
        setIsPremium(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for custom events from other components
  useEffect(() => {
    const handleShowLogin = () => setShowLoginModal(true);
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
    setViewMode("studying");
  };

  const handleLoadSet = (cards: Flashcard[], setId: string) => {
    setFlashcards(cards);
    setCurrentSetId(setId);
    updateLastStudied(setId);
    setViewMode("studying");
  };

  const handleBackToInput = () => {
    setViewMode("input");
    setFlashcards([]);
    setCurrentSetId(null);
  };

  const handleBackToHome = () => {
    setViewMode("home");
    setFlashcards([]);
    setCurrentSetId(null);
    window.history.pushState({}, '', '/');
  };

  const handleViewSavedSets = () => {
    setViewMode("saved");
    window.history.pushState({}, '', '/saved');
  };

  const handleCreateNew = () => {
    setViewMode("createFlow");
    window.history.pushState({}, '', '/create');
  };

  const handleViewSettings = () => {
    setViewMode("settings");
    window.history.pushState({}, '', '/settings');
  };

  // Sync URL with viewMode
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/create') {
        setViewMode('createFlow');
      } else if (path === '/saved') {
        setViewMode('saved');
      } else if (path === '/settings') {
        setViewMode('settings');
      } else {
        setViewMode('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-stone-50 dark:bg-slate-900">
      {/* Only load analytics if user accepted cookies */}
      {analyticsEnabled && <Analytics />}
      {viewMode === "home" && (
        <div className="min-h-screen flex flex-col">

          {/* Top Navigation */}
          <nav className="px-4 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                StudyMaxx
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Pricing Tab */}
              <a
                href="/pricing"
                className="px-4 py-2 rounded-md font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                Pricing
              </a>
              
              {user ? (
                <>
                  <button
                    onClick={handleViewSettings}
                    className="px-4 py-2 rounded-md font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
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
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-5 py-2.5 rounded-md font-bold text-sm bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 border-2 border-purple-400/50 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </nav>
          
          {/* Hero Section */}
          <div className="flex-1 flex flex-col px-4 py-6 max-w-3xl mx-auto w-full bg-slate-900 dark:bg-transparent rounded-b-3xl">
            
            {/* Main Hero - Punchy & Direct */}
            <div className="text-center mb-6">
              {/* Live visitors counter */}
              <div className="flex justify-center mb-4">
                <LiveVisitorsCounter />
              </div>
              
              {/* Micro social proof */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mb-6 shadow-lg shadow-emerald-500/20">
                <span className="flex -space-x-2">
                  <span className="w-8 h-8 rounded-full ring-2 ring-slate-800 flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#3b82f6', color: 'white'}}>J</span>
                  <span className="w-8 h-8 rounded-full ring-2 ring-slate-800 flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#a855f7', color: 'white'}}>A</span>
                  <span className="w-8 h-8 rounded-full ring-2 ring-slate-800 flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#ec4899', color: 'white'}}>M</span>
                  <span className="w-8 h-8 rounded-full ring-2 ring-slate-800 flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#f97316', color: 'white'}}>S</span>
                </span>
                <span className="text-sm font-black text-emerald-400">1000+ students acing exams</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-black mb-4 leading-[1.1]">
                <span className="text-white">Turn Your Notes Into</span>
                <br/>
                <span className="inline-block mt-2 text-white">
                  Perfect Flashcards
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto font-semibold leading-relaxed drop-shadow-md">
                Paste your notes. Get smart flashcards with quiz mode. <span className="font-black text-emerald-400">Instant results.</span>
              </p>

              {/* CTAs - Side by side, no overlap */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                {/* Primary CTA */}
                <button
                  onClick={handleCreateNew}
                  className="group relative inline-flex items-center justify-center gap-3 px-12 py-6 rounded-md text-xl font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:-translate-y-1 active:translate-y-0 transition-all duration-200 w-full sm:w-auto shadow-xl hover:shadow-2xl border-2 border-slate-200 dark:border-slate-700"
                >
                  <span>{user ? "Create study set" : "Create study set"}</span>
                  {/* Shine effect */}
                  <div className="absolute inset-0 rounded-md overflow-hidden">
                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                  </div>
                </button>

                {/* My Sets button for logged in users */}
                {user && savedSets.length > 0 && (
                  <button
                    onClick={handleViewSavedSets}
                    className="px-8 py-6 rounded-md text-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-200 w-full sm:w-auto border-2 border-slate-200 dark:border-slate-700"
                  >
                    My study sets ({savedSets.length})
                  </button>
                )}
              </div>
              
              {!user && (
                <p className="text-base text-emerald-400 font-bold flex items-center justify-center gap-2 drop-shadow-md">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  3 free study sets · No credit card · No signup required
                </p>
              )}
            </div>

            {/* Powerful Benefits - What users get */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-md shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1">
                <h3 className="text-lg font-black text-white mb-1">Lightning Fast</h3>
                <p className="text-emerald-100 text-sm">Auto-generate perfect flashcards</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-violet-600 to-purple-600 rounded-md shadow-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all hover:-translate-y-1">
                <h3 className="text-lg font-black text-white mb-1">Quiz Mode</h3>
                <p className="text-violet-100 text-sm">Smart quizzes, track progress</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md shadow-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all hover:-translate-y-1">
                <h3 className="text-lg font-black text-white mb-1">Any Subject</h3>
                <p className="text-blue-100 text-sm">Math, Science, Languages & more</p>
              </div>
            </div>

            {/* Social Proof & Trust */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 bg-slate-800/50 rounded-md hover:bg-emerald-500/10 transition-all hover:shadow-lg hover:shadow-emerald-500/20">
                <div className="text-2xl font-black text-white mb-0.5">
                  <AnimatedCounter end={1000} suffix="+" duration={2000} />
                </div>
                <span className="text-xs font-bold text-slate-400">Active Students</span>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-md hover:bg-violet-500/10 transition-all hover:shadow-lg hover:shadow-violet-500/20">
                <div className="text-2xl font-black text-white mb-0.5">
                  <AnimatedCounter end={50} suffix="k+" duration={2000} />
                </div>
                <span className="text-xs font-bold text-slate-400">Flashcards Made</span>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-md hover:bg-blue-500/10 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="text-2xl font-black text-white mb-0.5">
                  <AnimatedCounter end={4.9} suffix="/5" duration={2000} decimals={1} />
                </div>
                <span className="text-xs font-bold text-slate-400">Student Rating</span>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-md hover:bg-pink-500/10 transition-all hover:shadow-lg hover:shadow-pink-500/20">
                <div className="text-2xl font-black text-white mb-0.5">AI</div>
                <span className="text-xs font-bold text-slate-400">Powered Learning</span>
              </div>
            </div>

            {/* Premium Pricing Cards */}
            <div className="mt-16 mb-8">
              <div className="text-center mb-8">
                {isPremium && user ? (
                  <>
                    <div className="inline-block px-4 py-2 rounded-full border border-emerald-500 bg-emerald-500/20 mb-4">
                      <span className="text-sm font-bold text-emerald-300">Premium Active</span>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">You have Premium</h2>
                    <p className="text-slate-400">Unlimited study sets and all features unlocked</p>
                  </>
                ) : (
                  <>
                    <div className="inline-block px-4 py-2 rounded-full border border-red-500 bg-red-500/20 mb-4 animate-pulse">
                      <span className="text-sm font-bold text-red-300">⚠️ EARLY BIRD - ENDS FEB 10</span>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">Premium Early Bird - Special Launch Pricing</h2>
                    <p className="text-slate-400">Keep this price as long as you stay subscribed. Prices increase on Feb 10</p>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Free Plan */}
                <div className="p-8 bg-slate-800/30 rounded-md border border-slate-700/50">
                  <h3 className="text-2xl font-bold text-white mb-6">Free</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3 text-slate-400">
                      <svg className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>3 study sets per day</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-400">
                      <svg className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>Paste notes</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-400">
                      <svg className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>All study modes</span>
                    </li>
                  </ul>
                </div>

                {/* Premium Early Bird Plan */}
                <div className="p-6 rounded-md border-2 border-emerald-500 relative" style={{background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(19, 78, 74, 0.4) 100%)', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.2)'}}>
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-md animate-pulse">EARLY BIRD</span>
                  </div>
                  {isPremium && user && (
                    <div className="absolute top-14 right-4">
                      <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md">Active</span>
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-emerald-300 mb-1">Premium Early Bird</h3>
                  <p className="text-xs text-red-300 font-bold mb-3">Prices increase on Feb 10 - Lock in now!</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">$2.99</span>
                      <span className="text-slate-400">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span><span className="font-bold text-white">Unlimited</span> study sets</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>Image uploads with OCR</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>Word document uploads</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>Priority AI processing</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>Multi-device sync</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span>Share study sets</span>
                    </li>
                    <li className="flex items-start gap-3 text-emerald-300">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      <span className="font-bold">Access to all premium features</span>
                    </li>
                  </ul>
                  <button
                    onClick={async () => {
                      if (!user) {
                        setShowLoginModal(true);
                      } else if (isPremium) {
                        try {
                          const res = await fetch('/api/stripe/portal', { method: 'POST' });
                          const data = await res.json();
                          if (data.url) {
                            window.location.href = data.url;
                          }
                        } catch (error) {
                          console.error('Error redirecting to portal:', error);
                        }
                      } else {
                        window.location.href = '/pricing';
                      }
                    }}
                    className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-md transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {isPremium && user ? 'Manage Subscription' : 'Lock In Early Bird Price'}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2">Keep this price as long as you stay subscribed - Cancel anytime</p>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Works instantly
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Secure & private
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Loved by students
              </span>
            </div>
          </div>

          {/* Footer - Minimal */}
          <footer className="mt-16 pt-8 border-t border-slate-700/50 pb-8">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
              <a href="/pricing" className="hover:text-emerald-400 transition-colors font-medium">💎 Pricing</a>
              <span className="text-slate-600">·</span>
              <a href="mailto:studymaxxer@gmail.com" className="hover:text-emerald-400 transition-colors">Contact</a>
              <span className="text-slate-600">·</span>
              <a href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</a>
              <span className="text-slate-600">·</span>
              <a href="/terms" className="hover:text-emerald-400 transition-colors">Terms</a>
              <span className="text-slate-600">·</span>
              <span>© 2026 StudyMaxx</span>
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
      {viewMode === "createFlow" && (
        <CreateFlowView
          onGenerateFlashcards={handleGenerateFlashcards}
          onBack={handleBackToHome}
          onRequestLogin={() => setShowLoginModal(true)}
        />
      )}
      {viewMode === "studying" && (
        <StudyView 
          flashcards={flashcards}
          currentSetId={currentSetId}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "saved" && (
        <SavedSetsView 
          onLoadSet={handleLoadSet}
          onBack={handleBackToHome}
        />
      )}
      {viewMode === "settings" && (
        <SettingsView 
          onBack={handleBackToHome}
        />
      )}

      {/* Modals - rendered at all times, not just in home view */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onSkip={() => setShowLoginModal(false)}
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

      {/* Floating Feedback Button */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center"
        title={settings.language === "no" ? "Send tilbakemelding" : "Send Feedback"}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </main>
  );
}
