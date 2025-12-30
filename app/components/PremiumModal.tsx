"use client";

import { useState } from "react";
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
}

export default function PremiumModal({ 
  onClose, 
  isOpen, 
  setsCreated = 1, 
  customMessage,
  isDailyLimit = false,
  onRequestLogin
}: PremiumModalProps) {
  const t = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const features = getPremiumFeatures();
  const pitch = getPremiumPitch();

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // User not logged in - open login modal
        if (onRequestLogin) {
          setIsLoading(false);
          onClose(); // Close premium modal
          onRequestLogin(); // Open login modal
          return;
        } else {
          setError("Please sign in to upgrade to Premium");
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
      window.location.href = url;
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
        className="relative max-w-xl w-full animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ 
          background: '#1f2937',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
          color: '#f9fafb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 rounded-t-3xl overflow-hidden">
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
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
          <div className="relative flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-4xl shadow-2xl">
              {isDailyLimit ? "⏰" : "⚡"}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-4xl font-black text-center text-white mb-2 drop-shadow-lg">
            {isDailyLimit ? (t("daily_limit_reached") || "Daily Limit Reached") : (t("ascend_to_premium") || "Ascend to Premium")}
          </h2>

          {/* Subtitle */}
          <p className="text-center text-white/95 font-medium text-lg drop-shadow">
            {isDailyLimit 
              ? (t("come_back_tomorrow") || "Come back tomorrow, or ascend now") 
              : (t("study_smarter_not_longer") || "Study smarter, not longer")}
          </p>
        </div>

        {/* Content */}
        <div className="p-8" style={{ background: '#1f2937', color: '#f9fafb' }}>
          
          {/* Why Premium? - AI Costs Explanation */}
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-2xl p-5 mb-6 border-2 border-blue-700">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🤖</div>
              <div>
                <h3 className="font-bold text-blue-100 mb-2">{t("why_premium") || "Why Premium?"}</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {t("ai_costs_explanation") || 
                   "AI-powered flashcard generation costs us money with every creation. Premium helps us cover these costs and keep improving StudyMaxx for serious students like you."}
                </p>
              </div>
            </div>
          </div>

          {!customMessage && !isDailyLimit && (
            <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-2xl p-5 mb-6 border-2 border-red-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-bold text-gray-100">{t("study_sets_created") || "Study sets created"}</span>
                <span className="text-2xl font-black text-orange-400">{setsCreated} / 1</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-sm text-gray-700 font-medium mt-3">
                🚫 {t("limit_reached_upgrade") || "Limit reached! Upgrade to create unlimited study sets."}
              </p>
            </div>
          )}
          
          {isDailyLimit && (
            <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 rounded-2xl p-5 mb-6 border-2 border-orange-700">
              <div className="flex items-start gap-3">
                <div className="text-3xl">⏰</div>
                <div>
                  <h3 className="font-bold text-orange-100 mb-2">{t("daily_generation_limit") || "Daily Generation Limit"}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed mb-2">
                    {t("free_users_daily_limit") || "Free users get 1 AI generation per day. Your limit resets at midnight."}
                  </p>
                  <p className="text-sm font-bold text-orange-700">
                    ⚡ {t("premium_unlimited") || "Premium users get unlimited AI generations!"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feature list */}
          <div className="mb-6">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2" style={{ color: '#f9fafb' }}>
              <span>🚀</span>
              <span>What you get with Premium:</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {features.slice(0, 6).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl border border-gray-600">
                  <div className="text-2xl">{feature.split(' ')[0]}</div>
                  <div className="flex-1 text-sm font-semibold text-gray-100">{feature.split(' ').slice(1).join(' ')}</div>
                  <div className="text-green-600 font-bold">✓</div>
                </div>
              ))}
            </div>
          </div>

          {/* Why Premium */}
          <div className="bg-blue-900/40 border-2 border-blue-700 rounded-2xl p-4 mb-6">
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="text-sm text-blue-100 font-medium">
                <strong className="font-bold">Why does Premium cost money?</strong> Real AI costs real money per request. Premium keeps StudyMaxx running and improving — no ads, no data selling, just honest pricing.
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 mb-5" style={{ color: '#ffffff' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-5xl font-black" style={{ color: '#ffffff' }}>
                  {PRICING.monthly.display}
                </div>
                <div className="text-lg font-bold opacity-90" style={{ color: '#ffffff' }}>per month</div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75 line-through" style={{ color: '#ffffff' }}>
                  Worth 200+ kr
                </div>
                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
                  ☕ Less than a coffee
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold bg-white/20 rounded-lg px-3 py-2">
              <span>⚡</span>
              <span>Cancel anytime. No tricks. No hassle.</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border-2 border-red-300 rounded-xl text-base font-bold text-red-900">
              ⚠️ {error}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-black rounded-2xl transition-all text-xl shadow-2xl hover:shadow-3xl hover:scale-105 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Ascend to Premium Now</span>
                  <span>→</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 font-bold transition-colors text-base rounded-xl"
              style={{ color: '#9ca3af', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f9fafb'; e.currentTarget.style.background = '#374151'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
            >
              Maybe later
            </button>
          </div>

          {/* Trust signals */}
          <div className="mt-6 pt-6 border-t-2 border-gray-700 flex items-center justify-center gap-6 text-sm font-semibold" style={{ color: '#9ca3af' }}>
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <span>Secure payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>Cancel anytime</span>
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
