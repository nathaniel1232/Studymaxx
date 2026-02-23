"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface PremiumModalProps {
  onClose: () => void;
  isOpen: boolean;
  setsCreated?: number;
  customMessage?: string;
  isDailyLimit?: boolean;
  onRequestLogin?: () => void;
  isPremium?: boolean;
}

export default function PremiumModal({ 
  onClose, 
  isOpen, 
  setsCreated = 1, 
  customMessage,
  isDailyLimit = false,
  onRequestLogin,
  isPremium = false
}: PremiumModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  // Monitor auth state continuously
  useEffect(() => {
    if (!supabase) return;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };
    
    checkAuth();

    try {
      const { data: { subscription } } = supabase!.auth.onAuthStateChange(
        (_event, session) => {
          setIsLoggedIn(!!session);
        }
      );
      return () => { subscription?.unsubscribe(); };
    } catch (error) {
      console.error("Error subscribing to auth:", error);
    }
  }, []);

  if (!isOpen) return null;
  
  // Don't show the modal at all for premium users
  if (isPremium) return null;

  const handleUpgrade = async () => {
    if (!isLoggedIn) {
      // User needs to sign in first
      if (onRequestLogin) {
        onClose();
        onRequestLogin();
      }
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (!supabase) {
        setError("App not fully loaded. Please refresh.");
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to upgrade.");
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ interval: billingInterval }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError("Failed to create checkout. Please try again.");
          setIsLoading(false);
        }
      } else {
        const errorData = await response.json();
        if (errorData.hasActiveSubscription) {
          setError("You already have an active subscription!");
        } else {
          setError(errorData.error || "Something went wrong. Please try again.");
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" 
      onClick={onClose}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div 
        className="relative w-full sm:max-w-md animate-scale-in rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--modal-bg, #ffffff)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="p-4 pb-3 flex items-start justify-between border-b" style={{ borderColor: 'var(--modal-border, #e2e8f0)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
               </div>
               <span className="text-xs font-bold tracking-wider uppercase" style={{ color: '#06b6d4' }}>Premium</span>
            </div>
            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--modal-text, #0f172a)' }}>
              Unlimited studying
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: 'var(--modal-close-bg, #f1f5f9)', color: 'var(--modal-close-text, #64748b)' }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">

          {/* Price display */}
          <div className="text-center py-2">
            {billingInterval === 'month' ? (
              <div>
                <span className="text-3xl font-bold" style={{ color: 'var(--modal-text, #0f172a)' }}>$5.99</span>
                <span className="text-sm ml-1" style={{ color: 'var(--modal-muted, #64748b)' }}>/month</span>
              </div>
            ) : (
              <div>
                <span className="text-3xl font-bold" style={{ color: 'var(--modal-text, #0f172a)' }}>$4.42</span>
                <span className="text-sm ml-1" style={{ color: 'var(--modal-muted, #64748b)' }}>/month</span>
                <p className="text-xs mt-1" style={{ color: 'var(--modal-muted, #64748b)' }}>Billed $52.99/year</p>
              </div>
            )}
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ backgroundColor: 'var(--modal-toggle-bg, #f1f5f9)' }}>
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  billingInterval === 'month' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm' 
                    : ''
                }`}
                style={{ color: billingInterval === 'month' ? 'var(--modal-text, #0f172a)' : 'var(--modal-muted, #64748b)' }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingInterval === 'year' 
                    ? 'bg-cyan-500 text-white shadow-sm' 
                    : ''
                }`}
                style={billingInterval !== 'year' ? { color: 'var(--modal-muted, #64748b)' } : undefined}
              >
                Yearly
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  billingInterval === 'year' ? 'bg-white/25 text-white' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                }`}>
                  -26%
                </span>
              </button>
            </div>
          </div>

          {/* Key Benefits - clean, no emojis */}
          <div className="space-y-2 px-1">
            {[
              { title: 'Unlimited study sets', desc: 'Create as many as you need, every day' },
              { title: 'PDF, image & audio uploads', desc: 'Turn any file into flashcards' },
              { title: 'YouTube to flashcards', desc: 'Drop a video link, get study material' },
              { title: 'AI chat tutor', desc: 'Ask questions about your material' },
              { title: 'Up to 75 cards per set', desc: 'More cards, deeper understanding' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#06b6d4' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--modal-text, #0f172a)' }}>{feature.title}</p>
                  <p className="text-[11px]" style={{ color: 'var(--modal-muted, #64748b)' }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-center font-medium flex items-center justify-center gap-1" style={{ color: 'var(--modal-muted, #94a3b8)' }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
            Cancel anytime · Secure checkout via Stripe
          </p>

          {error && (
            <div className="w-full p-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300 text-center font-medium">
              {error}
            </div>
          )}

          {isPremium ? (
            <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl text-center">
              <p className="text-sm font-bold" style={{ color: '#059669' }}>You're a Premium member</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--modal-muted, #64748b)' }}>You already have unlimited access.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full py-3 font-bold rounded-xl transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#06b6d4', 
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(6,182,212,0.3)'
                }}
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : !isLoggedIn ? (
                  <span>Sign in to upgrade</span>
                ) : (
                  <span>Upgrade for {billingInterval === 'month' ? '$5.99/mo' : '$4.42/mo'}</span>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-2 text-xs rounded-lg transition-all font-medium text-center"
                style={{ color: 'var(--modal-muted, #64748b)' }}
              >
                Maybe later
              </button>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes scale-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out;
          }
          :root {
            --modal-bg: #ffffff;
            --modal-text: #0f172a;
            --modal-muted: #64748b;
            --modal-border: #e2e8f0;
            --modal-close-bg: #f1f5f9;
            --modal-close-text: #64748b;
            --modal-toggle-bg: #f1f5f9;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --modal-bg: #1a1a2e;
              --modal-text: #e2e8f0;
              --modal-muted: #94a3b8;
              --modal-border: rgba(255,255,255,0.1);
              --modal-close-bg: rgba(255,255,255,0.1);
              --modal-close-text: #94a3b8;
              --modal-toggle-bg: rgba(255,255,255,0.08);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
