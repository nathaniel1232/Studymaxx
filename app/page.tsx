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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Load saved sets after hydration
  useEffect(() => {
    const loadSavedSets = async () => {
      const sets = await getSavedFlashcardSets();
      setSavedSets(sets);
    };
    loadSavedSets();
  }, [viewMode]); // Reload when view changes

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
            
            // Show success message
            alert('🎉 Premium activated! All features unlocked. Refreshing page...');
            window.location.reload();
          } else {
            console.error('[Premium] Activation failed:', await response.text());
          }
        } catch (error) {
          console.error('[Premium] Activation error:', error);
        }
      }
    };
    
    checkPremiumSuccess();
  }, [user]);

  // Handle OAuth success redirect - refresh auth state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    if (authSuccess === 'success') {
      console.log('[Auth] OAuth callback detected - refreshing session...');
      // Clear the param
      window.history.replaceState({}, '', '/');
      
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
        
        setIsPremium(data?.is_premium || false);
      }
    };
    
    loadUser();
    const unsubscribe = onAuthStateChange((newUser) => {
      setUser(newUser);
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
          .then(({ data }) => setIsPremium(data?.is_premium || false));
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
          {/* Animated gradient mesh background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-teal-400/20 via-cyan-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-400/20 via-purple-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
            <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-400/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>
          </div>

          {/* Top Navigation */}
          <nav className="max-w-7xl mx-auto w-full flex justify-between items-center mb-8 relative" style={{ zIndex: 100 }}>
            <div className="flex items-center gap-3" style={{ position: 'relative', zIndex: 1 }}>
              <div className="text-2xl font-black bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                StudyMaxx
              </div>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg">
                BETA
              </span>
            </div>
            
            <div className="flex items-center gap-3" style={{ position: 'relative', zIndex: 1000 }}>
              {user ? (
                <UserProfileDropdown 
                  user={user} 
                  isPremium={isPremium}
                  onNavigateSettings={handleViewSettings}
                  onUpgradePremium={() => setShowPremiumModal(true)}
                />
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={handleViewSettings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-105"
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
                <span>{t("settings")}</span>
              </button>
            </div>
          </nav>
          
          {/* Hero Section */}
          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="text-center max-w-4xl mx-auto px-4 py-12">
              <h1 className="text-7xl md:text-8xl lg:text-9xl font-black mb-6 leading-none text-teal-600 dark:text-teal-400">
                StudyMaxx
              </h1>
              
              <p className="text-2xl md:text-3xl mb-4 font-bold text-gray-900 dark:text-white">
                {settings.language === "no" ? "Lær smartere" : "Study smarter"}
              </p>
              
              <p className="text-lg md:text-xl mb-3 font-medium text-gray-800 dark:text-gray-200">
                {settings.language === "no" 
                  ? "Transformer notater til AI-genererte kunnskapskort"
                  : "Transform notes into AI-powered flashcards"}
              </p>
              
              <p className="text-lg mb-12 max-w-2xl mx-auto" style={{ color: 'var(--foreground-muted)' }}>
                {settings.language === "no"
                  ? "Last opp PDF-er, bilder eller lim inn tekst. Få personlige studiesett på sekunder."
                  : "Upload PDFs, images, or paste text. Get personalized study sets in seconds."}
              </p>

              {/* Free tier info */}
              {!isPremium && (
                <div className="mb-8 inline-block px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {settings.language === "no"
                      ? "🎁 1 gratis studiesett per 24 timer"
                      : "🎁 1 free study set every 24 hours"}
                  </p>
                </div>
              )}
              
              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <button
                  onClick={handleCreateNew}
                  className="group relative px-10 py-5 rounded-2xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #6366f1 100%)',
                    boxShadow: '0 10px 40px rgba(20, 184, 166, 0.4)'
                  }}
                >
                  <span className="flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    {settings.language === "no" ? "Lag studiesett" : "Create study set"}
                  </span>
                </button>
                
                {savedSets.length > 0 && (
                  <button
                    onClick={handleViewSavedSets}
                    className="px-10 py-5 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'var(--surface)',
                      border: '2px solid var(--border)',
                      color: 'var(--foreground)',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    {settings.language === "no" 
                      ? `Dine sett (${savedSets.length})`
                      : `My sets (${savedSets.length})`}
                  </button>
                )}
              </div>

              {/* Study Fact Badge */}
              <div className="mb-8 flex justify-center">
                <StudyFactBadge context="general" position="inline" />
              </div>

              {/* What is StudyMaxx? Section */}
              <div className="mb-12 max-w-2xl mx-auto p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '2px solid var(--border)' }}>
                <h3 className="text-xl font-bold mb-3 text-center" style={{ color: 'var(--foreground)' }}>
                  {settings.language === "no" ? "💡 Hva er StudyMaxx?" : "💡 What is StudyMaxx?"}
                </h3>
                <div className="text-base leading-relaxed space-y-2" style={{ color: 'var(--foreground)' }}>
                  {settings.language === "no" ? (
                    <>
                      <p><strong>Notater</strong> → <strong>Kunnskapskort</strong> → <strong>Bedre karakterer</strong></p>
                      <p>Bruk AI til å gjøre notater om til effektive studiesett. Øv, test deg selv, og hev karakterene dine.</p>
                      <p className="text-sm font-bold" style={{ color: '#14b8a6' }}>Studer smartere, ikke lengre. Oppnå main character energy i fagene dine.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Notes</strong> → <strong>Flashcards</strong> → <strong>Better Grades</strong></p>
                      <p>Use AI to turn your notes into effective study sets. Practice, self-test, and ascend your grades.</p>
                      <p className="text-sm font-bold" style={{ color: '#14b8a6' }}>Study smarter, not longer. Achieve main character energy in your studies.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="p-6 rounded-2xl backdrop-blur-sm border-2 hover:scale-105 transition-transform duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                  <div className="text-5xl mb-3 animate-pulse" style={{ animationDuration: '2s' }}>⚡</div>
                  <div className="font-bold text-lg mb-2" style={{ color: 'var(--foreground)' }}>
                    {settings.language === "no" ? "Lynraskt" : "Lightning Fast"}
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                    {settings.language === "no" ? "Få studiesett på sekunder med AI" : "Get study sets in seconds with AI"}
                  </div>
                </div>
                
                <div className="p-6 rounded-2xl backdrop-blur-sm border-2 hover:scale-105 transition-transform duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                  <div className="text-5xl mb-3 inline-block animate-bounce" style={{ animationDuration: '3s' }}>🎯</div>
                  <div className="font-bold text-lg mb-2" style={{ color: 'var(--foreground)' }}>
                    {settings.language === "no" ? "Smart læring" : "Smart Learning"}
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                    {settings.language === "no" ? "Tilpasset til ditt nivå og mål" : "Adapted to your level and goals"}
                  </div>
                </div>
                
                <div className="p-6 rounded-2xl backdrop-blur-sm border-2 hover:scale-105 transition-transform duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
                  <div className="text-5xl mb-3 inline-block hover:rotate-12 transition-transform duration-300">📚</div>
                  <div className="font-bold text-lg mb-2" style={{ color: 'var(--foreground)' }}>
                    {settings.language === "no" ? "Alle formater" : "All Formats"}
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                    {settings.language === "no" ? "PDF, bilder, tekst og YouTube" : "PDFs, images, text, and YouTube"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="max-w-7xl mx-auto w-full py-8 relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
              <a href="mailto:contact@studymaxx.app" className="hover:text-blue-600 transition-colors">
                {settings.language === "no" ? "Kontakt" : "Contact"}
              </a>
              <span>·</span>
              <a href="/privacy" className="hover:text-blue-600 transition-colors">
                {settings.language === "no" ? "Personvern" : "Privacy"}
              </a>
              <span>·</span>
              <a href="/terms" className="hover:text-blue-600 transition-colors">
                {settings.language === "no" ? "Vilkår" : "Terms"}
              </a>
              <span>·</span>
              <span>© 2025 StudyMaxx</span>
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
        />
      )}
    </main>
  );
}
