"use client";

import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import InputView from "./components/InputView";
import CreateFlowView from "./components/CreateFlowView";
import StudyView from "./components/StudyView";
import SavedSetsView from "./components/SavedSetsView";
import SettingsView from "./components/SettingsView";
import LoginModal from "./components/LoginModal";
import PremiumModal from "./components/PremiumModal";
import UserProfileDropdown from "./components/UserProfileDropdown";
import StudyFactBadge from "./components/StudyFactBadge";
import LiveVisitorsCounter from "./components/LiveVisitorsCounter";
import Toast from "./components/Toast";
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
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const [currentGrade, setCurrentGrade] = useState<string>("");
  const [savedSets, setSavedSets] = useState<FlashcardSet[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [remainingStudySets, setRemainingStudySets] = useState(3);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);

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
    const handleShowPremium = () => setShowPremiumModal(true);

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
      <Analytics />
      {viewMode === "home" && (
        <div className="min-h-screen flex flex-col">

          {/* Top Navigation */}
          <nav className="px-4 py-4 flex justify-between items-center border-b border-slate-700 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-black text-white">
                StudyMaxx
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <button
                    onClick={handleViewSettings}
                    className="px-4 py-2 rounded-md font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-all flex items-center gap-2"
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
                    onUpgradePremium={() => setShowPremiumModal(true)}
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
          <div className="flex-1 flex flex-col px-4 py-6 max-w-3xl mx-auto w-full">
            
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
                <span className="text-sm font-black text-emerald-400">500+ students acing exams</span>
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
                  className="group relative inline-flex items-center justify-center gap-3 px-12 py-6 rounded-md text-xl font-black text-white hover:-translate-y-2 hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    boxShadow: '0 0 50px rgba(6, 182, 212, 0.8)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)';
                    e.currentTarget.style.boxShadow = '0 0 70px rgba(6, 182, 212, 1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
                    e.currentTarget.style.boxShadow = '0 0 50px rgba(6, 182, 212, 0.8)';
                  }}
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
                    className="px-8 py-6 rounded-md text-lg font-bold bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-200 w-full sm:w-auto"
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
                <div className="text-2xl font-black text-white mb-0.5">500+</div>
                <span className="text-xs font-bold text-slate-400">Active Students</span>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-md hover:bg-violet-500/10 transition-all hover:shadow-lg hover:shadow-violet-500/20">
                <div className="text-2xl font-black text-white mb-0.5">10k+</div>
                <span className="text-xs font-bold text-slate-400">Flashcards Made</span>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-md hover:bg-blue-500/10 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="text-2xl font-black text-white mb-0.5">4.9/5</div>
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
                    <div className="inline-block px-4 py-2 rounded-full border border-amber-500 bg-amber-500/20 mb-4">
                      <span className="text-sm font-bold text-amber-300">Upgrade Available</span>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">Get Premium for $2.99/month</h2>
                    <p className="text-slate-400">Unlimited study sets and premium features</p>
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

                {/* Premium Plan */}
                <div className="p-6 rounded-md border-2 border-emerald-500 relative" style={{background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(19, 78, 74, 0.4) 100%)', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.2)'}}>
                  {isPremium && user && (
                    <div className="absolute top-6 right-6">
                      <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md">Active</span>
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-emerald-300 mb-2">Premium</h3>
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
                  </ul>
                  <button
                    onClick={() => !user ? setShowLoginModal(true) : isPremium ? setShowPremiumModal(true) : setShowPremiumModal(true)}
                    className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-md transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {isPremium && user ? 'Manage Subscription' : 'Upgrade to Premium'}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2">Cancel anytime</p>
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

      {showPremiumModal && (
        <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          setsCreated={savedSets.length}
          onRequestLogin={() => setShowLoginModal(true)}
          isPremium={isPremium}
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
    </main>
  );
}
