"use client";

import { useState, useEffect } from "react";
import { useSettings, useTranslation, Theme, Language, UIScale, GradeSystem } from "../contexts/SettingsContext";
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
  const { settings, updateTheme, updateLanguage, updateUIScale, updateGradeSystem } = useSettings();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser && supabase) {
        // Fetch user's premium status from database
        const { data, error } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', currentUser.id)
          .single();

        if (!error && data) {
          setIsPremium(data.is_premium || false);
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all flex items-center gap-2"
          >
            <ArrowIcon direction="left" size={14} />
            <span>{t("back")}</span>
          </button>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {t("settings")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("personalize")}
          </p>
        </div>

        {/* Success message */}
        {showSuccessMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm">
              ✓ {t("settings_saved")}
            </p>
          </div>
        )}

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Account Section */}
          {!user && (
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Account
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sign in to sync your study sets across devices.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showLogin'))}
                className="w-full py-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors"
              >
                Sign In / Create Account
              </button>
            </section>
          )}
          {user && (
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Account
              </h2>

              <div className="space-y-3">
                {/* Email */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("email")}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</div>
                  </div>
                </div>

                {/* Premium Status */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  isPremium 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Subscription</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {isPremium ? (
                        <span className="text-amber-600 dark:text-amber-400">Premium</span>
                      ) : (
                        <span>{t("free") || "Free"}</span>
                      )}
                    </div>
                  </div>
                  <div>
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
                            console.log('Portal response:', data);
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('showPremium'));
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm text-red-600 dark:text-red-400"
                >
                  Sign Out
                </button>
              </div>
            </section>
          )}

          {/* Appearance Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Appearance
            </h2>

            {/* Theme */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as Theme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleUpdateSetting(() => updateTheme(theme))}
                    className={`option-card ${settings.theme === theme ? 'selected' : ''}`}
                  >
                    <div className="text-sm capitalize">{theme}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* UI Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                UI Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["small", "default", "large"] as UIScale[]).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => handleUpdateSetting(() => updateUIScale(scale))}
                    className={`option-card ${settings.uiScale === scale ? 'selected' : ''}`}
                  >
                    <div className="text-sm capitalize">{scale}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Language & Region Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Language & Region
            </h2>

            {/* Language */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["en", "no"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleUpdateSetting(() => updateLanguage(lang))}
                    className={`option-card ${settings.language === lang ? 'selected' : ''}`}
                  >
                    <div className="text-lg mb-0.5">
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

            {/* Grade System */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade System
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["A-F", "1-6", "percentage"] as GradeSystem[]).map((system) => (
                  <button
                    key={system}
                    onClick={() => handleUpdateSetting(() => updateGradeSystem(system))}
                    className={`option-card ${settings.gradeSystem === system ? 'selected' : ''}`}
                  >
                    <div className="text-sm">{system}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* How StudyMaxx Works Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t("how_studymaxx_works")}
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("built_on_science")}
            </p>

            <div className="space-y-3">
              {studyFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    {fact.text[settings.language]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("source")}: {fact.source[settings.language]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What's New Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What's New
            </h2>

            <button
              onClick={() => setShowUpdatesModal(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              View Update Log
            </button>
          </section>

          {/* Contact Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("contact_us")}
            </h2>

            <div className="space-y-3">
              {/* Report Problem Button */}
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full py-2.5 px-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium transition-colors"
              >
                Report a Problem
              </button>

              {/* Email Contact */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {t("contact_email")}
                </div>
                <a 
                  href="mailto:studymaxxer@gmail.com"
                  className="text-teal-600 dark:text-teal-400 text-sm hover:underline"
                >
                  studymaxxer@gmail.com
                </a>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("about")}
            </h2>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200 dark:border-gray-700">
                <span>{t("version")}</span>
                <span className="text-gray-900 dark:text-white">2.0.0</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200 dark:border-gray-700">
                <span>{t("storage")}</span>
                <span className="text-gray-900 dark:text-white">{t("local_browser")}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>{t("privacy")}</span>
                <span className="text-gray-900 dark:text-white">{t("all_data_local")}</span>
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
