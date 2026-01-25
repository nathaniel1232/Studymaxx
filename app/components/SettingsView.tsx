"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings, useTranslation, Theme, Language, GradeSystem } from "../contexts/SettingsContext";
import { studyFacts } from "../utils/studyFacts";
import ArrowIcon from "./icons/ArrowIcon";
import { getCurrentUser, signOut, supabase } from "../utils/supabase";
import ReportProblemModal from "./ReportProblemModal";
import UpdatesModal from "./UpdatesModal";

interface SettingsViewProps {
  onBack: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const t = useTranslation();
  const { settings, updateTheme, updateLanguage, updateGradeSystem } = useSettings();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Set avatar URL from user metadata
      if (currentUser?.user_metadata?.avatar_url) {
        setAvatarUrl(currentUser.user_metadata.avatar_url);
      }

      if (currentUser && supabase) {
        // Fetch user's premium status from database
        const { data, error } = await supabase
          .from('users')
          .select('is_premium, avatar_url')
          .eq('id', currentUser.id)
          .single();

        if (!error && data) {
          setIsPremium(data.is_premium || false);
          // Also check avatar_url from database
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;
    
    setIsUploadingAvatar(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to upload an avatar');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAvatarUrl(data.avatarUrl);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        // Refresh user to get updated metadata
        await supabase.auth.refreshSession();
      } else {
        alert(data.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !supabase) return;
    
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    setIsUploadingAvatar(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        setAvatarUrl(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload(); // Refresh to clear session
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpdateSetting = (updateFn: () => void) => {
    updateFn();
    
    // Show success message briefly
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      {/* Top bar med logo */}
      <div className="sticky top-0 z-50 px-4 py-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-black text-white">
            StudyMaxx
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-5 py-2.5 text-sm bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold rounded-md hover:from-slate-600 hover:to-slate-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <ArrowIcon direction="left" size={14} />
            <span>{t("back")}</span>
          </button>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t("settings")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("personalize")}
          </p>
        </div>

        {/* Success message */}
        {showSuccessMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
            <p className="text-green-500 text-sm font-bold text-center">
              ✓ {t("settings_saved")}
            </p>
          </div>
        )}

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Account Section */}
          {!user && (
            <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-3">
                Account
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Sign in to sync your study sets across devices.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showLogin'))}
                className="w-full py-4 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-black shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                Sign In / Create Account
              </button>
            </section>
          )}
          {user && (
            <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">
                Account
              </h2>

              <div className="space-y-3">
                {/* Profile Picture */}
                <div className="p-4 bg-slate-900/50 rounded-md">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Profile Picture</div>
                  <div className="flex items-center gap-4">
                    {/* Avatar Preview */}
                    <div className="relative">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Profile" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-slate-700"
                        />
                      ) : (
                        <div 
                          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-slate-700"
                          style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)' }}
                        >
                          {user.email?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1 space-y-2">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="w-full py-2 px-4 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-all disabled:opacity-50"
                      >
                        {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      {avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="w-full py-2 px-4 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-all disabled:opacity-50"
                        >
                          Remove Photo
                        </button>
                      )}
                      <p className="text-xs text-slate-500">JPG, PNG, GIF or WebP. Max 2MB.</p>
                    </div>
                  </div>
                </div>
                
                {/* Email */}
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-md">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{t("email")}</div>
                    <div className="text-sm font-bold text-white">{user.email}</div>
                  </div>
                </div>

                {/* Premium Status */}
                <div className={`p-4 rounded-md ${
                  isPremium 
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-slate-900/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Subscription</div>
                      <div className="text-sm font-bold text-white">
                        {isPremium ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <span>⭐</span> Premium Member
                          </span>
                        ) : (
                          <span className="text-slate-300">Free Tier</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
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
                            alert(`Error: ${data.error || 'Failed to open portal.'}`);
                          }
                        } catch (error) {
                          console.error('Failed to open portal:', error);
                        }
                      }}
                      className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm font-black rounded-md transition-all"
                    >
                      Manage Subscription
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('showPremium'));
                      }}
                      className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 hover:from-amber-300 hover:via-yellow-400 hover:to-orange-400 text-slate-950 font-black rounded-md shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                      ⭐ UPGRADE TO PREMIUM
                    </button>
                  )}
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-md bg-slate-900/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 font-bold transition-all"
                >
                  🚪 Sign Out
                </button>
              </div>
            </section>
          )}

          {/* Appearance Section */}
          <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              Appearance
            </h2>

            {/* Theme */}
            <div className="mb-5">
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "dark", "system"] as Theme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleUpdateSetting(() => updateTheme(theme))}
                    className="p-4 rounded-md transition-all duration-200 font-bold text-sm"
                    style={{
                      background: settings.theme === theme 
                        ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                        : '#1e293b',
                      color: settings.theme === theme ? 'white' : '#94a3b8',
                      boxShadow: settings.theme === theme ? '0 4px 15px rgba(6, 182, 212, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (settings.theme !== theme) {
                        e.currentTarget.style.background = '#334155';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (settings.theme !== theme) {
                        e.currentTarget.style.background = '#1e293b';
                        e.currentTarget.style.color = '#94a3b8';
                      }
                    }}
                  >
                    <div className="capitalize">{theme}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Language & Region Section */}
          <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              Language & Region
            </h2>

            {/* Language */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">
                Language
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["en", "no"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleUpdateSetting(() => updateLanguage(lang))}
                    className="p-5 rounded-md transition-all duration-200 flex flex-col items-center justify-center font-bold"
                    style={{
                      background: settings.language === lang 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : '#1e293b',
                      color: settings.language === lang ? 'white' : '#94a3b8',
                      boxShadow: settings.language === lang ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (settings.language !== lang) {
                        e.currentTarget.style.background = '#334155';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (settings.language !== lang) {
                        e.currentTarget.style.background = '#1e293b';
                        e.currentTarget.style.color = '#94a3b8';
                      }
                    }}
                  >
                    <div className="text-3xl mb-2">
                      {lang === "en" && "🇬🇧"}
                      {lang === "no" && "🇳🇴"}
                    </div>
                    <div className="text-sm">
                      {lang === "en" ? "English" : "Norsk"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Grade System - Hidden for now */}
            {/* <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">
                Grade System
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["A-F", "1-6", "percentage"] as GradeSystem[]).map((system) => (
                  <button
                    key={system}
                    onClick={() => handleUpdateSetting(() => updateGradeSystem(system))}
                    className="p-4 rounded-md transition-all duration-200 font-bold text-sm"
                    style={{
                      background: settings.gradeSystem === system 
                        ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
                        : '#1e293b',
                      color: settings.gradeSystem === system ? 'white' : '#94a3b8',
                      boxShadow: settings.gradeSystem === system ? '0 4px 15px rgba(20, 184, 166, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (settings.gradeSystem !== system) {
                        e.currentTarget.style.background = '#334155';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (settings.gradeSystem !== system) {
                        e.currentTarget.style.background = '#1e293b';
                        e.currentTarget.style.color = '#94a3b8';
                      }
                    }}
                  >
                    <div className="text-sm uppercase">{system}</div>
                  </button>
                ))}
              </div>
            </div> */}
          </section>

          {/* Study Tutorial Section */}
          <section className="bg-gradient-to-br from-cyan-600/20 to-teal-600/20 rounded-md p-6 shadow-xl border border-cyan-500/30">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              📚 How to Study with StudyMaxx
            </h2>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-slate-900/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Create Your Flashcards</h3>
                  <p className="text-xs text-slate-400 mt-1">Paste your notes or upload a document. StudyMaxx will automatically generate smart flashcards.</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 bg-slate-900/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Study Mode - Learn the Cards</h3>
                  <p className="text-xs text-slate-400 mt-1">Go through each flashcard. Read the question, think of the answer, then flip to check. Mark cards as "Got it" or "Need practice".</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 bg-slate-900/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Quiz Mode - Test Yourself</h3>
                  <p className="text-xs text-slate-400 mt-1">Take the quiz to see how well you know the material. Choose from multiple choice options and track your score.</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 bg-slate-900/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Repeat Until Mastery</h3>
                  <p className="text-xs text-slate-400 mt-1">Focus on cards you got wrong. Study them again and retake the quiz until you can answer everything correctly.</p>
                </div>
              </div>
              
              <div className="p-4 bg-emerald-500/10 rounded-md border border-emerald-500/30">
                <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-2">💡 Pro Tip</h3>
                <p className="text-xs text-slate-300 mt-1">Study in short sessions (15-25 minutes) with breaks. Your brain remembers better when you space out your learning!</p>
              </div>
            </div>
          </section>

          {/* How StudyMaxx Works Section */}
          <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-3">
              {t("how_studymaxx_works")}
            </h2>

            <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">
              {t("built_on_science")}
            </p>

            <div className="space-y-3">
              {studyFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="p-4 bg-slate-900/50 rounded-md"
                >
                  <p className="text-sm text-slate-200 mb-2 font-medium">
                    {fact.text[settings.language]}
                  </p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {t("source")}: {fact.source[settings.language]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What's New Section */}
          <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              What's New
            </h2>

            <button
              onClick={() => setShowUpdatesModal(true)}
              className="w-full py-4 px-6 rounded-md bg-slate-900/50 hover:bg-slate-700/50 text-white text-sm font-black transition-all flex items-center justify-center gap-3"
            >
              <span>📋</span> View Update Log
            </button>
          </section>

          {/* Contact Section */}
          <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {t("contact_us")}
            </h2>

            <div className="space-y-4">
              {/* Report Problem Button */}
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full py-4 px-6 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-black transition-all border border-red-500/20 flex items-center justify-center gap-3"
              >
                <span>⚠️</span> Report a Problem
              </button>

              {/* Email Contact */}
              <div className="p-4 bg-slate-900/50 rounded-md">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                  {t("contact_email")}
                </div>
                <a 
                  href="mailto:studymaxxer@gmail.com"
                  className="text-violet-400 font-bold text-sm hover:underline"
                >
                  studymaxxer@gmail.com
                </a>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="bg-slate-800/50 rounded-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {t("about")}
            </h2>

            <div className="space-y-0 text-sm">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-slate-400 font-bold uppercase text-xs">Version</span>
                <span className="text-white font-black">2.0.0</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-slate-400 font-bold uppercase text-xs">Storage</span>
                <span className="text-white font-black">{t("local_browser")}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-400 font-bold uppercase text-xs">Privacy</span>
                <span className="text-white font-black">{t("all_data_local")}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer spacing */}
        <div className="h-16"></div>
      </div>

      {/* Modals */}
      <ReportProblemModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
      />
      <UpdatesModal 
        isOpen={showUpdatesModal} 
        onClose={() => setShowUpdatesModal(false)} 
      />
    </div>
  );
}
