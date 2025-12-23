"use client";

import { useState } from "react";
import { useTranslation } from "../contexts/SettingsContext";
import { signInWithMagicLink, signInWithGoogle, isSupabaseConfigured } from "../utils/supabase";

interface LoginModalProps {
  onClose: () => void;
  onSkip: () => void;
}

export default function LoginModal({ onClose, onSkip }: LoginModalProps) {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    
    if (!supabaseConfigured) {
      // Fallback: simulate email sent if Supabase not configured
      setTimeout(() => {
        setEmailSent(true);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      await signInWithMagicLink(email);
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabaseConfigured) {
      setError("Authentication not configured. Please set up Supabase.");
      return;
    }

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="card-elevated max-w-md w-full p-10 rounded-3xl shadow-2xl bounce-in"
        style={{ background: 'var(--surface-elevated)', border: '2px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {!emailSent ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4 pulse-glow">✨</div>
              <h2 className="text-3xl font-black mb-3 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                {t("save_your_progress")}
              </h2>
              <p className="text-base font-medium" style={{ color: 'var(--foreground-muted)' }}>
                {t("login_benefit")}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/40 dark:to-pink-900/40 border-2 border-red-300 dark:border-red-700">
                <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              </div>
            )}

            {/* Email Login */}
            <form onSubmit={handleEmailLogin} className="mb-6">
              <label className="block text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <span>📧</span>
                <span>{t("email")}</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("enter_email")}
                className="input mb-4"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="btn btn-primary w-full py-4 text-lg font-black flex items-center justify-center gap-2"
              >
                {isLoading ? t("sending") : t("send_magic_link")}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {t("or")}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="btn btn-secondary w-full py-3 font-medium flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{t("continue_with_google")}</span>
            </button>

            {/* Skip Button */}
            <button
              onClick={onSkip}
              className="btn btn-ghost w-full mt-4 py-2"
            >
              {t("skip_for_now")}
            </button>

            {/* Privacy Note */}
            <p className="text-xs text-center mt-4" style={{ color: 'var(--foreground-muted)' }}>
              {t("login_privacy")}
            </p>
          </>
        ) : (
          <>
            {/* Email Sent Confirmation */}
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                {t("check_your_email")}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--foreground-muted)' }}>
                {t("magic_link_sent", { email })}
              </p>
              <button
                onClick={onClose}
                className="btn btn-primary w-full py-3 font-bold"
              >
                {t("got_it")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
