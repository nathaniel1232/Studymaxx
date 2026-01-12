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
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '32px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.25), 0 0 100px rgba(249, 115, 22, 0.15)',
          color: '#1f2937'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-12 rounded-t-3xl overflow-hidden">
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 9L9 15M9 9l6 6" />
            </svg>
          </button>

          {/* Icon */}
          <div className="relative flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center text-4xl font-bold shadow-2xl" style={{ color: '#fff' }}>
              ⚡
            </div>
          </div>

          {/* Title */}
          <h2 className="text-4xl font-black text-center text-white mb-3">
            {isDailyLimit ? (t("daily_limit_reached") || "Daily Limit Reached") : "Unlock Premium"}
          </h2>

          {/* Subtitle */}
          <p className="text-center text-white/95 text-lg font-semibold">
            {isDailyLimit 
              ? (t("come_back_tomorrow") || "Come back tomorrow, or upgrade now") 
              : "Study smarter, not harder"}
          </p>
        </div>

        {/* Content */}
        <div className="p-12" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
          
          {/* Trust Badge Section */}
          <div className="mb-8 flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
              <span className="text-green-600 font-bold">✓</span>
              <span className="text-sm font-semibold text-green-700">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
              <span className="text-blue-600 font-bold">✓</span>
              <span className="text-sm font-semibold text-blue-700">Cancel Anytime</span>
            </div>
          </div>
          
          {/* Why Premium? - AI Costs Explanation */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 mb-8 border border-orange-200">
            <h3 className="font-bold text-gray-900 mb-2 text-lg flex items-center gap-2">
              <span className="text-orange-600">🎓</span>
              Why Choose Premium?
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Premium unlocks the full power of AI-driven learning. Generate unlimited study materials, upload any file format, and study anywhere—anytime.
            </p>
          </div>

          {!customMessage && !isDailyLimit && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 mb-8 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black text-red-600 uppercase tracking-wider">Your Limit</span>
                <span className="text-2xl font-black text-red-600">{setsCreated} / 3</span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-sm font-semibold text-red-700 mt-3">
                You've reached your free limit. Upgrade now for unlimited generations.
              </p>
            </div>
          )}
          
          {isDailyLimit && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border border-amber-200">
              <h3 className="font-bold text-gray-900 mb-2 text-lg">⏰ Daily Generation Limit</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                Free users get 3 AI generations per day. Your limit resets at midnight.
              </p>
              <p className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                Premium users get unlimited generations — start now!
              </p>
            </div>
          )}

          {/* Feature list */}
          <div className="mb-8">
            <h3 className="text-lg font-black mb-5 text-gray-900">
              ✨ Premium Includes:
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:shadow-lg transition-shadow">
                <div className="text-2xl">🚀</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Unlimited Generations</div>
                  <div className="text-sm text-gray-600">Create as many study sets as you want</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 hover:shadow-lg transition-shadow">
                <div className="text-2xl">🖼️</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Image OCR</div>
                  <div className="text-sm text-gray-600">Extract text from images and PDFs</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 hover:shadow-lg transition-shadow">
                <div className="text-2xl">📄</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Word Documents</div>
                  <div className="text-sm text-gray-600">Upload .docx files directly</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200 hover:shadow-lg transition-shadow">
                <div className="text-2xl">📚</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Unlimited Sets</div>
                  <div className="text-sm text-gray-600">Save unlimited study sets</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 hover:shadow-lg transition-shadow">
                <div className="text-2xl">☁️</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Cloud Sync</div>
                  <div className="text-sm text-gray-600">Access your sets across all devices</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-rose-50 to-red-50 rounded-2xl border border-rose-200 hover:shadow-lg transition-shadow">
                <div className="text-2xl">🔗</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Share Study Sets</div>
                  <div className="text-sm text-gray-600">Collaborate with classmates</div>
                </div>
              </div>
            </div>
          </div>

          {/* Login reminder for unauthenticated users */}
          {!isLoggedIn && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border-2 border-blue-300">
              <h3 className="font-bold text-blue-900 mb-2 text-lg flex items-center gap-2">
                <span>🔒</span>
                Sign In Required
              </h3>
              <p className="text-blue-800 leading-relaxed">
                To upgrade to Premium, please sign in first. This secures your subscription and ensures you don't lose access.
              </p>
            </div>
          )}

          {/* Pricing Card */}
          <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-red-600 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-5xl font-black text-white mb-1">
                  {PRICING.monthly.display}
                </div>
                <div className="text-white/90 font-semibold text-lg">Per month</div>
                <div className="text-white/75 text-sm mt-2">Save on annual plan</div>
              </div>
              <div className="text-right">
                <div className="px-5 py-3 bg-white/25 rounded-2xl backdrop-blur-sm">
                  <div className="text-white/90 font-bold text-sm">
                    ✓ Instant Access
                  </div>
                  <div className="text-white/75 text-xs mt-1">
                    All features included
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          {/* CTA Buttons */}
          {isPremium ? (
            <div className="space-y-3">
              <div className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-3 shadow-lg">
                <span className="text-2xl">✓</span>
                <span>Premium Active</span>
              </div>
              <div className="bg-green-50 rounded-2xl p-6 text-center border-2 border-green-200">
                <p className="text-green-900 font-semibold">
                  🎉 You have access to all premium features!
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-4 font-bold transition-all text-lg rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-4">
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
                className="w-full py-6 bg-gradient-to-r from-orange-500 via-orange-500 to-red-600 hover:from-orange-600 hover:via-orange-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-black rounded-3xl transition-all text-xl shadow-2xl hover:shadow-2xl hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-3 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : isLoggedIn ? (
                  <>
                    <span className="text-2xl">⚡</span>
                    <span>Upgrade Now — {PRICING.monthly.display}/mo</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🚀</span>
                    <span>Sign In to Continue</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-4 font-bold transition-all text-lg rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-900 active:bg-gray-400"
              >
                Maybe later
              </button>
            </div>
          )}

          {/* Trust signals */}
          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">🔐</div>
                <div className="text-xs font-semibold text-gray-600">Stripe Secure</div>
              </div>
              <div>
                <div className="text-2xl mb-1">⚙️</div>
                <div className="text-xs font-semibold text-gray-600">Cancel Anytime</div>
              </div>
              <div>
                <div className="text-2xl mb-1">💰</div>
                <div className="text-xs font-semibold text-gray-600">Money-Back</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
