"use client";

import { useState } from "react";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithMagicLink, resetPassword, isSupabaseConfigured, validateEmailForAuth } from "../utils/supabase";
import { useSettings } from "../contexts/SettingsContext";

interface LoginModalProps {
  onClose: () => void;
  onSkip?: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function LoginModal({ onClose, onSkip, initialMode = 'signin' }: LoginModalProps) {
  const handleSkip = onSkip || onClose;
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Use shared validation util (blocks test/risky domains properly)
    const validation = validateEmailForAuth(email);
    if (!validation.valid) {
      setError(validation.error || "Invalid email address");
      return;
    }
    
    // Magic link mode only needs email
    if (isMagicLink) {
      setIsLoading(true);
      
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
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    
    if (!supabaseConfigured) {
      setError("Authentication not configured. Please set up Supabase.");
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        if (result.user) {
          setEmailVerificationNeeded(true);
          setRegisteredEmail(email);
        }
      } else {
        const result = await signInWithEmail(email, password);
        if (result.user) {
          setSuccess(true);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed') || err.message?.includes('email_not_confirmed')) {
        setEmailVerificationNeeded(true);
        setRegisteredEmail(email);
      } else if (err.message?.includes('Invalid login credentials')) {
        setError("Wrong email or password. Try again or create a new account.");
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

    setError(null);
    setIsLoading(true);
    
    try {
      await signInWithGoogle();
      // OAuth redirect will happen, no need to do anything else
    } catch (err: any) {
      console.error('[LoginModal] Google OAuth error:', err);
      setIsLoading(false);
      
      // Show helpful error for network hosts
      if (typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+/.test(window.location.hostname)) {
        setError(`Google Sign-In failed. Network host detected - you must add ${window.location.origin}/auth/callback to Google Cloud Console. See NETWORK_AUTH_FIX.md for instructions.`);
      } else {
        setError(err.message || "Failed to sign in with Google. Please try again or use email/password.");
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.6)', 
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[380px] rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          backgroundColor: isDarkMode ? '#141a2e' : '#ffffff',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end p-3 pb-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: isDarkMode ? '#475569' : '#cbd5e1' }}
            onMouseEnter={(e) => e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b'}
            onMouseLeave={(e) => e.currentTarget.style.color = isDarkMode ? '#475569' : '#cbd5e1'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="px-7 pb-8">
        {emailVerificationNeeded ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ backgroundColor: isDarkMode ? 'rgba(34,197,94,0.1)' : '#f0fdf4' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>
              Check your email
            </h2>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              We sent a verification link to <strong style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{registeredEmail}</strong>
            </p>
            <div className="p-4 rounded-xl mb-5 text-left" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
              <p className="text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>Next steps:</p>
              <ol className="text-sm space-y-1.5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                <li>1. Open the verification email</li>
                <li>2. Click the verification link</li>
                <li>3. You&#39;ll be logged in automatically</li>
              </ol>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#06b6d4' }}
            >
              Got it
            </button>
          </div>
        ) : magicLinkSent ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>
              Check your email
            </h2>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              We sent a login link to <strong style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{email}</strong>
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#06b6d4' }}
            >
              Got it
            </button>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ backgroundColor: isDarkMode ? 'rgba(34,197,94,0.1)' : '#f0fdf4' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>
              Welcome back!
            </h2>
            <p className="text-sm" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Signing you in...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-2xl font-bold mb-1" style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>
                <span style={{ color: '#06b6d4' }}>Study</span>Maxx
              </div>
              <p className="text-sm" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                {isSignUp ? 'Create your account' : 'Sign in to your account'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : '#fef2f2', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
                {/* Helpful hint for network host login issues */}
                {typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+/.test(window.location.hostname) && (
                  <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid rgba(239,68,68,0.2)', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                    ℹ️ <strong>Network host detected:</strong> Add <code className="px-1 py-0.5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>{window.location.origin}/auth/callback</code> to Supabase redirect URLs. See <code>NETWORK_AUTH_FIX.md</code>
                  </div>
                )}
              </div>
            )}

            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2.5 mb-4 transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff', 
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                color: isDarkMode ? '#e2e8f0' : '#334155',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
              }}
            >
              <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
              <span className="text-xs font-medium" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full py-2.5 px-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
                    color: isDarkMode ? '#f1f5f9' : '#0f172a',
                    ['--tw-ring-color' as any]: 'rgba(6,182,212,0.2)',
                  }}
                  disabled={isLoading}
                  required
                />
              </div>

              {!isMagicLink && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full py-2.5 px-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
                      color: isDarkMode ? '#f1f5f9' : '#0f172a',
                      ['--tw-ring-color' as any]: 'rgba(6,182,212,0.2)',
                    }}
                    disabled={isLoading}
                    required
                    minLength={6}
                  />
                </div>
              )}

              {/* Forgot password */}
              {!isMagicLink && !isSignUp && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email.trim()) {
                        setError("Enter your email first, then click Forgot password");
                        return;
                      }
                      setIsLoading(true);
                      setError(null);
                      try {
                        await resetPassword(email.trim());
                        setResetSent(true);
                      } catch (err: any) {
                        setError(err.message || "Failed to send reset email");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-xs font-medium transition-colors hover:underline"
                    style={{ color: '#06b6d4' }}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {resetSent && (
                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
                    Password reset email sent! Check your inbox.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim() || (!isMagicLink && !password.trim())}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-white text-sm transition-all disabled:opacity-40 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#06b6d4' }}
              >
                {isLoading ? 'Please wait...' : (
                  isMagicLink ? 'Send magic link' : (isSignUp ? 'Create account' : 'Sign in')
                )}
              </button>
            </form>

            {/* Toggle options */}
            <div className="mt-4 space-y-1.5 text-center">
              <button
                onClick={() => {
                  setIsMagicLink(!isMagicLink);
                  setError(null);
                  setPassword("");
                }}
                className="text-xs transition-colors hover:underline"
                style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}
              >
                {isMagicLink ? 'Use password instead' : 'Use magic link (passwordless)'}
              </button>
              
              {!isMagicLink && (
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="block w-full text-xs transition-colors"
                  style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                >
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <span style={{ color: '#06b6d4', fontWeight: 500 }}>{isSignUp ? 'Sign in' : 'Sign up'}</span>
                </button>
              )}
            </div>

            {/* Skip */}
            <button
              onClick={handleSkip}
              className="w-full mt-4 py-2 text-xs transition-colors hover:underline"
              style={{ color: isDarkMode ? '#334155' : '#cbd5e1' }}
            >
              Skip for now
            </button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

