"use client";

import { useState } from "react";
import { useTranslation } from "../contexts/SettingsContext";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithMagicLink, isSupabaseConfigured } from "../utils/supabase";

interface LoginModalProps {
  onClose: () => void;
  onSkip: () => void;
}

export default function LoginModal({ onClose, onSkip }: LoginModalProps) {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Magic link mode only needs email
    if (isMagicLink) {
      if (!email.trim()) {
        setError("Please enter your email");
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      if (!supabaseConfigured) {
        setError("Authentication not configured. Please set up Supabase.");
        setIsLoading(false);
        return;
      }
      
      try {
        await signInWithMagicLink(email);
        setMagicLinkSent(true);
      } catch (err: any) {
        setError(err.message || "Failed to send magic link");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Password mode needs both email and password
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    if (!supabaseConfigured) {
      setError("Authentication not configured. Please set up Supabase.");
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        if (result.user) {
          // Check if email confirmation is required
          if (result.user.identities && result.user.identities.length === 0) {
            // Email confirmation required
            setEmailVerificationNeeded(true);
            setRegisteredEmail(email);
          } else {
            // No confirmation needed, user is logged in
            setSuccess(true);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        }
      } else {
        const result = await signInWithEmail(email, password);
        if (result.user) {
          setSuccess(true);
          setTimeout(() => {
            window.location.reload(); // Refresh to load user session
          }, 1500);
        }
      }
    } catch (err: any) {
      // Check for specific email not confirmed error
      if (err.message?.includes('Email not confirmed') || err.message?.includes('email_not_confirmed')) {
        setEmailVerificationNeeded(true);
        setRegisteredEmail(email);
      } else {
        setError(err.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`);
      }
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
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{ 
        background: 'rgba(0, 0, 0, 0.7)', 
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full rounded-3xl shadow-2xl overflow-hidden"
        style={{ 
          background: 'var(--surface-elevated)', 
          border: '2px solid var(--border)',
          position: 'relative',
          zIndex: 10001,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          animation: 'slideUp 0.3s ease-out',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(30px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        <div className="p-8">
        {emailVerificationNeeded ? (
          <>
            {/* Email Verification Required */}
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
                Verify Your Email
              </h2>
              <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  We've sent a verification link to:
                </p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 mb-3">
                  {registeredEmail}
                </p>
                <div className="text-left text-sm space-y-2" style={{ color: 'var(--foreground-muted)' }}>
                  <p className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Click the verification link in your email</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Come back here and sign in</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    <span>Check your spam folder if you don't see it</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEmailVerificationNeeded(false);
                  setIsSignUp(false);
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Got it! Take me to sign in
              </button>
            </div>
          </>
        ) : magicLinkSent ? (
          <>
            {/* Magic Link Sent Confirmation */}
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                {t("magic_link_sent_title") || "Check Your Email!"}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--foreground-muted)' }}>
                {t("magic_link_sent")?.replace("{email}", email) || 
                 `We've sent a magic link to ${email}. Click it to log in instantly.`}
              </p>
              <button
                onClick={onClose}
                className="btn btn-primary w-full"
              >
                Got it!
              </button>
            </div>
          </>
        ) : !success ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4 pulse-glow">✨</div>
              <h2 className="text-3xl font-black mb-3 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                {isMagicLink ? "Magic Link" : (isSignUp ? "Create Account" : "Welcome Back")}
              </h2>
              <p className="text-base font-medium" style={{ color: 'var(--foreground-muted)' }}>
                {isMagicLink ? "Sign in with a magic link" : (isSignUp ? "Join StudyMaxx to save your progress" : "Sign in to continue")}
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

            {/* Email & Password Form */}
            <form onSubmit={handleEmailAuth} className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                  <span>📧</span>
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input w-full"
                  disabled={isLoading}
                  required
                />
              </div>

              {!isMagicLink && (
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                    <span>🔒</span>
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input w-full"
                    disabled={isLoading}
                    required
                    minLength={6}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim() || (!isMagicLink && !password.trim())}
                className="btn btn-primary w-full py-4 text-lg font-black flex items-center justify-center gap-2"
              >
                {isLoading ? "⏳ Loading..." : (
                  isMagicLink ? (t("send_magic_link") || "Send magic link") : 
                  (isSignUp ? "Create Account" : "Sign In")
                )}
              </button>
            </form>

            {/* Toggle Sign Up / Sign In / Magic Link */}
            <div className="text-center mb-6 space-y-2">
              {!isMagicLink && (
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="block w-full text-sm font-medium hover:underline"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  {isSignUp ? t("already_have_account") || "Already have an account? Sign in" : t("no_account_create_one") || "Don't have an account? Sign up"}
                </button>
              )}
              <button
                onClick={() => {
                  setIsMagicLink(!isMagicLink);
                  setError(null);
                  setPassword("");
                }}
                className="block w-full text-sm font-medium hover:underline"
                style={{ color: 'var(--foreground-muted)' }}
              >
                {isMagicLink ? "Use password instead" : "🪄 Use magic link (passwordless)"}
              </button>
            </div>

            {/* ONBOARDING GUIDANCE - Show guidance based on state */}
            {isSignUp && (
              <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <span className="text-base">ℹ️</span>
                  <span>{t("verify_email_required") || "We'll send you a verification email. You must click the link before you can log in."}</span>
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }}></div>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="btn btn-secondary w-full py-3 font-medium flex items-center justify-center gap-3 mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Skip Button */}
            <button
              onClick={onSkip}
              className="btn btn-ghost w-full py-2"
            >
              Skip for now
            </button>
          </>
        ) : (
          <>
            {/* Success Confirmation */}
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                {isSignUp ? "Account Created!" : "Welcome Back!"}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--foreground-muted)' }}>
                Redirecting...
              </p>
            </div>
          </>
        )}        </div>      </div>
    </div>
  );
}
