"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "../contexts/SettingsContext";
import { getPremiumFeatures, getPremiumPitch, PRICING } from "../utils/premium";
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
  const t = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  
  // Get pricing - safe for hydration
  const [pricing, setPricing] = useState(PRICING.get());

  useEffect(() => {
    // Re-calc pricing on mount to access window/navigator
    setPricing(PRICING.get());
  }, []);

  // Monitor auth state continuously
  useEffect(() => {
    if (!supabase) {
      return;
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };
    
    checkAuth();

    // Subscribe to auth state changes
    try {
      const { data: { subscription } } = supabase!.auth.onAuthStateChange(
        (event, session) => {
          setIsLoggedIn(!!session);
        }
      );

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error("Error subscribing to auth:", error);
    }
  }, []);

  if (!isOpen) return null;

  const features = getPremiumFeatures();
  const pitch = getPremiumPitch();

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Check if supabase is initialized
      if (!supabase) {
        setError("Internal error: Supabase not initialized");
        setIsLoading(false);
        return;
      }
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // User not logged in - open login modal
        if (onRequestLogin) {
          setIsLoading(false);
          // Brief message before closing
          setError("");
          onClose(); // Close premium modal
          setTimeout(() => onRequestLogin(), 300); // Open login modal after modal closes
          return;
        } else {
          setError("Please sign in first to upgrade to Premium. Use the Sign In button in the top menu.");
          setIsLoading(false);
          return;
        }
      }

      // Call Stripe checkout API with auth token
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ interval: billingInterval }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Failed to start checkout. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm md:max-w-md animate-scale-in rounded-md shadow-2xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-700 overflow-hidden ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.8)' // Fallback to ensure everything behind is dark
        }}
      >
        {/* Header - Solid & Clean */}
        <div className="bg-violet-50 dark:bg-violet-950 border-b border-violet-200 dark:border-violet-900 p-2.5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <div className="w-6 h-6 rounded-lg bg-violet-700 flex items-center justify-center text-white text-sm">
                  🎓
               </div>
               <span className="text-xs font-bold tracking-wider text-violet-700 dark:text-violet-400 uppercase">Premium</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              Unlimited Study Access
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-2.5 bg-white dark:bg-slate-900 flex flex-col gap-2">
          
          {/* Billing Switch - Yearly temporarily hidden */}
          <div className="flex justify-center mb-1">
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  billingInterval === 'month' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              {/* Yearly temporarily hidden
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  billingInterval === 'year' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Yearly
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
                  30%
                </span>
              </button>
              */}
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-1.5 px-1">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-700 dark:text-violet-400 text-xs font-bold">✓</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">Unlimited</span> – Create any amount
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-700 dark:text-violet-400 text-xs font-bold">✓</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">Smart</span> – DOCX & images
              </p>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 mx-1 border border-slate-200 dark:border-slate-700 flex flex-col items-center">
             <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {billingInterval === 'year' ? pricing.yearlyDisplay : pricing.display}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  / {billingInterval === 'year' ? 'year' : 'month'}
                </span>
             </div>
             {billingInterval === 'year' && (
               <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                 {pricing.yearMonthEquiv || 'a fraction'} / month equivalent
               </p>
             )}
             <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2 font-medium flex items-center gap-1">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
               Cancel anytime • Secure via Stripe
             </p>
          </div>

          {/* Student Value Message */}
          <div className="mx-1 p-2.5 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-md border border-cyan-500/20">
            <p className="text-xs text-center font-medium text-cyan-700 dark:text-cyan-400">
              💡 <span className="font-bold">2x better exam scores</span>
            </p>
          </div>

          {error && (
            <div className="w-full p-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300 text-center font-medium">
              {error}
            </div>
          )}

          {isPremium ? (
            <div className="w-full py-3 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold rounded-md text-center text-sm shadow-lg">
              ✅ Active Premium Member
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (isLoggedIn) {
                    handleUpgrade();
                  } else {
                    onClose();
                    if (onRequestLogin) {
                      onRequestLogin();
                    }
                  }
                }}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-md shadow-xl shadow-purple-500/40 border-2 border-purple-400/50 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : isLoggedIn ? (
                  <span>🚀 Start Premium Access</span>
                ) : (
                  <span>🔐 Sign In to Upgrade</span>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-medium text-center"
              >
                Maybe later
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
