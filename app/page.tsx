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
  };

  const handleViewSavedSets = () => {
    setViewMode("saved");
  };

  const handleCreateNew = () => {
    setViewMode("createFlow");
  };

  const handleViewSettings = () => {
    setViewMode("settings");
  };

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background)' }}>
      <Analytics />
      {viewMode === "home" && (
        <div className="min-h-screen px-4 py-6 flex flex-col relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-300/10 via-teal-300/10 to-transparent rounded-full blur-3xl" style={{ animationDuration: '8s' }}></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-300/10 via-purple-300/10 to-transparent rounded-full blur-3xl" style={{ animationDuration: '10s' }}></div>
          </div>

          {/* Top Navigation */}
          <nav className="max-w-7xl mx-auto w-full flex justify-between items-center mb-8 md:mb-12 relative px-4" style={{ zIndex: 100 }}>
            <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 1 }}>
              <div className="text-2xl md:text-3xl font-black text-teal-600 dark:text-teal-400">
                StudyMaxx
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3" style={{ position: 'relative', zIndex: 1000 }}>
              {user ? (
                <UserProfileDropdown 
                  user={user} 
                  isPremium={isPremium}
                  isOwner={isOwner}
                  onNavigateSettings={handleViewSettings}
                  onUpgradePremium={() => setShowPremiumModal(true)}
                />
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all hover:scale-105 bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={handleViewSettings}
                className="hidden sm:flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-medium text-xs md:text-sm transition-all hover:scale-105"
                style={{ 
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground-muted)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">{t("settings")}</span>
              </button>
            </div>
          </nav>
          
          {/* Hero Section - CLEAR & SIMPLE */}
          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="max-w-3xl mx-auto px-4 py-4 md:py-8">
              {/* Main Headline - Direct & Clear */}
              <h1 className="text-4xl md:text-6xl font-black mb-4 md:mb-6 leading-tight" style={{ color: 'var(--foreground)' }}>
                Turn notes into flashcards in seconds
              </h1>
              
              {/* Subheading - What it does */}
              <p className="text-lg md:text-2xl mb-3 md:mb-4 font-medium" style={{ color: 'var(--foreground-muted)' }}>
                Paste your notes, get flashcards instantly. Study smarter.
              </p>
              
              {/* Social proof line - different based on login */}
              {!user ? (
                <p className="text-base md:text-lg mb-8 md:mb-12 font-semibold text-teal-600 dark:text-teal-400">
                  ⭐ Get started free - no signup needed
                </p>
              ) : null}

              {/* MAIN CTA - Different based on login status */}
              <div className="mb-12 md:mb-16 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-5">
                {user ? (
                  // Logged-in user: Primary action is "Create study set"
                  <button
                    onClick={handleCreateNew}
                    className="group relative px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl text-lg md:text-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 w-full sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                      boxShadow: '0 10px 30px rgba(20, 184, 166, 0.3)'
                    }}
                  >
                    <span className="flex items-center justify-center gap-2 md:gap-3">
                      <svg className="w-5 md:w-6 h-5 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Create study set
                    </span>
                  </button>
                ) : (
                  // Not logged in: "Try it now" with example
                  <button
                    onClick={() => {
                      setFlashcards([]);
                      setCurrentSetId(null);
                      setViewMode('createFlow');
                    }}
                    className="group relative px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl text-lg md:text-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 w-full sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                      boxShadow: '0 10px 30px rgba(20, 184, 166, 0.3)'
                    }}
                  >
                    Try it free
                  </button>
                )}
                
                {/* Secondary action: My Sets (if user exists and has sets) */}
                {user && savedSets.length > 0 && (
                  <button
                    onClick={handleViewSavedSets}
                    className="px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl text-lg md:text-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 w-full sm:w-auto"
                    style={{
                      background: 'var(--surface)',
                      border: '2.5px solid var(--border)',
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    My study sets ({savedSets.length})
                  </button>
                )}
              </div>

              {/* Before/After comparison */}
              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {/* Before */}
                <div className="p-6 rounded-2xl border-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="text-sm font-bold mb-3 text-red-600 dark:text-red-400">Without StudyMaxx:</div>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--foreground)' }}>
                    <p>Messy notes from class</p>
                    <p>Hours spent organizing</p>
                    <p>Boring study sessions</p>
                    <p>Forgetting what to study</p>
                  </div>
                </div>
                
                {/* After */}
                <div className="p-6 rounded-2xl border-2" style={{ background: 'var(--surface)', borderColor: '#14b8a6' }}>
                  <div className="text-sm font-bold mb-3 text-emerald-600 dark:text-emerald-400">With StudyMaxx:</div>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--foreground)' }}>
                    <p>Flashcards in seconds</p>
                    <p>AI extracts key points</p>
                    <p>Quiz yourself anytime</p>
                    <p>Actually remember things</p>
                  </div>
                </div>
              </div>

              {/* How it works - 3 simple steps */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: 'var(--foreground)' }}>3 simple steps</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-teal-600 dark:text-teal-400">
                      1
                    </div>
                    <h3 className="font-bold mb-2" style={{ color: 'var(--foreground)' }}>Paste or upload</h3>
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Notes, documents, or images</p>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      2
                    </div>
                    <h3 className="font-bold mb-2" style={{ color: 'var(--foreground)' }}>AI generates</h3>
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Smart summaries in just a few seconds</p>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      3
                    </div>
                    <h3 className="font-bold mb-2" style={{ color: 'var(--foreground)' }}>Study & improve</h3>
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Quiz mode, track progress, ace your exams</p>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mb-16 grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">Science-backed</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>study methods</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">0</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>setup required</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Any</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>device works</p>
                </div>
              </div>

              {/* How to Study Effectively */}
              <div className="mb-16 p-6 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>How to get the most out of StudyMaxx</h2>
                <div className="space-y-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                  <div className="flex gap-3">
                    <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">1.</span>
                    <p><strong style={{ color: 'var(--foreground)' }}>Create from your own notes.</strong> The best flashcards come from material you&apos;re actually studying. Paste your lecture notes, textbook summaries, or class materials.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">2.</span>
                    <p><strong style={{ color: 'var(--foreground)' }}>Study in short sessions.</strong> 15-20 minutes at a time works better than hour-long cramming. Take breaks, then come back.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">3.</span>
                    <p><strong style={{ color: 'var(--foreground)' }}>Use Test Yourself mode.</strong> Actively recalling answers (instead of just reading them) dramatically improves memory retention.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">4.</span>
                    <p><strong style={{ color: 'var(--foreground)' }}>Review before bed.</strong> Research shows that sleep helps consolidate what you&apos;ve learned. A quick review session before sleep can help information stick.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">5.</span>
                    <p><strong style={{ color: 'var(--foreground)' }}>Come back tomorrow.</strong> Spaced repetition—reviewing material over multiple days—is one of the most effective study techniques. Don&apos;t just study once.</p>
                  </div>
                </div>
              </div>

              {/* Sign in note - SUBTLE for logged-out users */}
              {!user && (
                <p className="text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
                  Want to save your sets? <button onClick={() => setShowLoginModal(true)} className="font-bold text-teal-600 dark:text-teal-400 hover:underline">Sign in free</button>
                </p>
              )}

              {/* Premium Features Section - Show for all users (upgrade CTA for free, status for premium) */}
              <div className="mt-16 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  {isPremium ? (
                    <>
                      <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 mb-4">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Premium Active</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                        You have Premium
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                        Unlimited study sets and all features unlocked
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                        Upgrade to Premium
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                        Unlimited study sets, all features, priority processing
                      </p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                      Free
                    </h4>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400">✓</span>
                        <span>3 study sets per day</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400">✓</span>
                        <span>Paste notes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400">✓</span>
                        <span>All study modes</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl border-2 relative" style={{ 
                    background: isPremium 
                      ? 'rgba(34, 197, 94, 0.05)'
                      : 'rgba(20, 184, 166, 0.05)',
                    borderColor: isPremium ? '#22c55e' : '#14b8a6'
                  }}>
                    <div className="absolute top-0 right-0 px-3 py-1 text-xs font-medium rounded-bl-lg" style={{ 
                      background: isPremium ? '#22c55e' : '#14b8a6',
                      color: 'white' 
                    }}>
                      {isPremium ? 'Active' : '$2.99/mo'}
                    </div>
                    <h4 className="text-base font-semibold mb-4" style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>
                      Premium
                    </h4>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      <li className="flex items-start gap-2">
                        <span style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>✓</span>
                        <span><strong>Unlimited</strong> study sets</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>✓</span>
                        <span>Image uploads with OCR</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>✓</span>
                        <span>Word document uploads</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>✓</span>
                        <span>Priority AI processing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>✓</span>
                        <span>Multi-device sync</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: isPremium ? '#22c55e' : '#14b8a6' }}>✓</span>
                        <span>Share study sets</span>
                      </li>
                    </ul>
                    {isPremium ? (
                      <button
                        onClick={async () => {
                          if (!user?.id) return;
                          try {
                            const response = await fetch('/api/stripe/portal', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.id })
                            });
                            const data = await response.json();
                            if (data.url) {
                              window.location.href = data.url;
                            } else {
                              alert(`Error: ${data.error || 'Failed to open portal. Please contact support.'}`);
                            }
                          } catch (error) {
                            console.error('Failed to open portal:', error);
                            alert('Failed to open subscription management. Please contact support.');
                          }
                        }}
                        className="mt-4 w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all hover:opacity-90"
                        style={{ background: '#22c55e' }}
                      >
                        Manage Subscription
                      </button>
                    ) : (
                      <button
                        onClick={() => !user ? setShowLoginModal(true) : setShowPremiumModal(true)}
                        className="mt-4 w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all hover:opacity-90"
                        style={{ background: '#14b8a6' }}
                      >
                        Upgrade — $2.99/mo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <footer className="max-w-7xl mx-auto w-full py-8 relative z-10 mt-8">
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                  <a href="mailto:studymaxxer@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Contact
                  </a>
                  <span>·</span>
                  <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Privacy
                  </a>
                  <span>·</span>
                  <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Terms
                  </a>
                  <span>·</span>
                  <span>© 2025 StudyMaxx</span>
                </div>
              </footer>
            </div>
          </div>
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
