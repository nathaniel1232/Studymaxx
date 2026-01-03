"use client";

import { useState, useEffect } from "react";
import { useSettings, useTranslation, Theme, Language, UIScale, GradeSystem } from "../contexts/SettingsContext";
import { studyFacts } from "../utils/studyFacts";
import ArrowIcon from "./icons/ArrowIcon";
import { getCurrentUser, signOut, supabase } from "../utils/supabase";

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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-6 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium rounded-full border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all flex items-center gap-2"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </button>

          <h1 className="text-page-title bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            {t("settings")}
          </h1>
          <p className="text-body text-gray-500 dark:text-gray-400">
            {t("personalize")}
          </p>
        </div>

        {/* Success message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-600 dark:text-green-400 text-sm font-medium">
              ✓ {t("settings_saved")}
            </p>
          </div>
        )}

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Account Section */}
          {!user && (
            <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>👤</span>
                Account
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sign in to sync your study sets across devices and unlock Premium features.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showLogin'))}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Sign In / Create Account</span>
              </button>
            </section>
          )}
          {user && (
            <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>👤</span>
                Account
              </h2>

              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("email")}</div>
                    <div className="font-medium text-gray-900 dark:text-white">{user.email}</div>
                  </div>
                  <span className="text-2xl">📧</span>
                </div>

                {/* Premium Status */}
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                  isPremium 
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 dark:border-amber-700'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subscription</div>
                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {isPremium ? (
                        <span className="text-amber-600 dark:text-amber-400">⭐ Premium</span>
                      ) : (
                        <span>{t("free") || "Free"}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isPremium ? (
                      <>
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
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-all text-sm"
                        >
                          Manage Subscription
                        </button>
                        <span className="text-3xl">✨</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">🆓</span>
                        <button
                          onClick={() => {
                            window.alert("Premium upgrade coming soon! In the meantime, you can upgrade from the main page.");
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg transition-all hover:scale-105 shadow-md text-sm"
                        >
                          Upgrade
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium text-red-600 dark:text-red-400 flex items-center justify-center gap-2"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </section>
          )}

          {/* Appearance Section */}
          <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🎨</span>
              Appearance
            </h2>

            {/* Theme */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "dark", "system"] as Theme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleUpdateSetting(() => updateTheme(theme))}
                    className={`option-card ${settings.theme === theme ? 'selected' : ''}`}
                  >
                    <div className="text-2xl mb-1">
                      {theme === "light" && "☀️"}
                      {theme === "dark" && "🌙"}
                      {theme === "system" && "💻"}
                    </div>
                    <div className="text-sm font-medium capitalize">{theme}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* UI Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                UI Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["small", "default", "large"] as UIScale[]).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => handleUpdateSetting(() => updateUIScale(scale))}
                    className={`option-card ${settings.uiScale === scale ? 'selected' : ''}`}
                  >
                    <div className="text-sm font-medium capitalize">{scale}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Changes text size and spacing throughout the app
              </p>
            </div>
          </section>

          {/* Language & Region Section */}
          <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🌍</span>
              Language & Region
            </h2>

            {/* Language */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Language
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["en", "no"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleUpdateSetting(() => updateLanguage(lang))}
                    className={`option-card ${settings.language === lang ? 'selected' : ''}`}
                  >
                    <div className="text-2xl mb-1">
                      {lang === "en" && "🇬🇧"}
                      {lang === "no" && "🇳🇴"}
                    </div>
                    <div className="text-sm font-medium">
                      {lang === "en" ? "English" : "Norsk"}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                More languages coming soon
              </p>
            </div>

            {/* Grade System */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Grade System
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["A-F", "1-6", "percentage"] as GradeSystem[]).map((system) => (
                  <button
                    key={system}
                    onClick={() => handleUpdateSetting(() => updateGradeSystem(system))}
                    className={`option-card ${settings.gradeSystem === system ? 'selected' : ''}`}
                  >
                    <div className="text-sm font-medium">{system}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Choose how grades are displayed throughout the app
              </p>
            </div>
          </section>

          {/* How StudyMaxx Works Section */}
          <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🧠</span>
              {t("how_studymaxx_works")}
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t("built_on_science")}
            </p>

            <div className="space-y-4">
              {studyFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {fact.text[settings.language]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {t("source")}: {fact.source[settings.language]}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                <strong className="text-gray-700 dark:text-gray-300">{t("our_approach")}:</strong> {t("approach_desc")}
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>✉️</span>
              {t("contact_us")}
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t("contact_description")}
            </p>

            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-2 border-teal-200 dark:border-teal-800 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📧</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white mb-2">
                    {t("contact_email")}
                  </div>
                  <a 
                    href="mailto:studymaxxer@gmail.com"
                    className="text-teal-600 dark:text-teal-400 font-medium hover:underline text-lg break-all"
                  >
                    studymaxxer@gmail.com
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t("send_email")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="card-elevated p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>ℹ️</span>
              {t("about")}
            </h2>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span>{t("version")}</span>
                <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span>{t("storage")}</span>
                <span className="font-medium text-gray-900 dark:text-white">{t("local_browser")}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>{t("privacy")}</span>
                <span className="font-medium text-gray-900 dark:text-white">{t("all_data_local")}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
              {t("local_storage_info")}
            </p>
          </section>
        </div>

        {/* Footer spacing */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}
