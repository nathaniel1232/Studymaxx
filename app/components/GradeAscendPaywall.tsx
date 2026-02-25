"use client";

/**
 * GradeAscendPaywall — Personalised Paywall
 *
 * Shown after completing the onboarding quiz.
 * Embeds LoginModal inline (z-[10002]) as a safety fallback.
 * Simple $5.99/mo or $52.99/yr pricing via Stripe.
 */

import { useState, useEffect, useRef } from "react";
import { OnboardingData } from "../utils/onboardingTypes";
import { supabase } from "../utils/supabase";
import LoginModal from "./LoginModal";

interface PaywallData {
  headline: string;
  subheadline: string;
  bullets: string[];
  currentGrade: string;
  targetGrade: string;
  weeksToTarget: number;
  improvementPercent: number;
  ctaText: string;
  urgencyText: string;
}

interface GradeAscendPaywallProps {
  data: OnboardingData;
  paywallData: PaywallData;
  onContinueFree: () => void;
  onLogin: () => void;
  isPremium?: boolean;
}

// ── Colour palette ──────────────────────────────────────────────────────────

const C = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#06b6d4",
} as const;

export default function GradeAscendPaywall({
  data,
  paywallData,
  onContinueFree,
  onLogin,
  isPremium = false,
}: GradeAscendPaywallProps) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showInlineLogin, setShowInlineLogin] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ── Auth state ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return;
    const check = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      setIsLoggedIn(!!session);
    };
    check();
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        setShowInlineLogin(false);
        // If user just signed in (not initial page load), send them to dashboard
        if (_e === 'SIGNED_IN') {
          onContinueFree();
        }
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // ── Intro campaign: $4.99 for first 24 hours from user's first visit ──────
  // TEMPORARILY DISABLED — re-enable by uncommenting the setIsIntroCampaign line below

  const [isIntroCampaign, setIsIntroCampaign] = useState(false);

  useEffect(() => {
    try {
      let firstVisit = localStorage.getItem('studymaxx_first_visit');
      if (!firstVisit) {
        firstVisit = Date.now().toString();
        localStorage.setItem('studymaxx_first_visit', firstVisit);
      }
      // const elapsed = Date.now() - parseInt(firstVisit, 10);
      // const CAMPAIGN_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
      // setIsIntroCampaign(!isPremium && elapsed < CAMPAIGN_WINDOW);
      setIsIntroCampaign(false); // DISABLED
    } catch { /* ignore */ }
  }, []);

  // ── Countdown (counts down from first visit + 24h) ─────────────────────────

  useEffect(() => {
    const tick = () => {
      try {
        const firstVisit = parseInt(localStorage.getItem('studymaxx_first_visit') || '0', 10);
        const CAMPAIGN_WINDOW = 24 * 60 * 60 * 1000;
        const deadline = firstVisit + CAMPAIGN_WINDOW;
        const diff = Math.max(0, deadline - Date.now());
        setCountdown({
          hours: Math.floor(diff / 3_600_000),
          minutes: Math.floor((diff % 3_600_000) / 60_000),
          seconds: Math.floor((diff % 60_000) / 1_000),
        });
        if (diff <= 0) { setIsIntroCampaign(false); setBillingInterval('month'); }
      } catch {
        // Fallback to end of day
        const now = new Date();
        const eod = new Date(now);
        eod.setHours(23, 59, 59, 999);
        const diff = eod.getTime() - now.getTime();
        setCountdown({
          hours: Math.floor(diff / 3_600_000),
          minutes: Math.floor((diff % 3_600_000) / 60_000),
          seconds: Math.floor((diff % 60_000) / 1_000),
        });
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // ── Stripe checkout ────────────────────────────────────────────────────────

  const handleGetPremium = async () => {
    if (!isLoggedIn) {
      setShowInlineLogin(true); // show login INSIDE the paywall (no z-index conflict)
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (!supabase) { setError("App not fully loaded. Please refresh."); setIsLoading(false); return; }

      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) { setError("Please sign in first."); setIsLoading(false); return; }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          interval: billingInterval,
          ...(isIntroCampaign && billingInterval === 'month' ? { isIntroOffer: true } : {}),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.url) { window.location.href = result.url; }
        else { setError("Could not create checkout. Please try again."); setIsLoading(false); }
      } else {
        const errData = await response.json();
        setError(errData.hasActiveSubscription
          ? "You already have an active subscription!"
          : errData.error || "Something went wrong.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setIsLoading(false);
    }
  };

  // ── Pricing ────────────────────────────────────────────────────────────────

  const MONTHLY        = 5.99;  // $5.99/mo
  const INTRO_MONTHLY  = 4.99;  // $4.99/mo campaign price
  const YEARLY_MONTHLY = 4.42;  // billed $52.99/yr
  const ANCHOR         = 9.99;

  const displayPrice = billingInterval === 'month'
    ? (isIntroCampaign ? INTRO_MONTHLY : MONTHLY)
    : YEARLY_MONTHLY;

  return (
    <>
      {/* ── CSS hover / animation rules ─────────────────────────────────── */}
      <style>{`
        .pw-cta {
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .pw-cta:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(6,182,212,0.42) !important;
        }
        .pw-cta:not(:disabled):active { transform: scale(0.98); }
        .pw-tab { transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
        .pw-tab:hover { opacity: 0.85; }
        @keyframes pw-pulse {
          0%, 100% { box-shadow: 0 4px 18px rgba(6,182,212,0.3); }
          50%       { box-shadow: 0 4px 26px rgba(6,182,212,0.55); }
        }
        .pw-cta-pulse:not(:disabled) { animation: pw-pulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── Inline login overlay (z-[10002] so it sits above paywall) ────── */}
      {showInlineLogin && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10002 }}>
          <LoginModal
            onClose={() => setShowInlineLogin(false)}
            initialMode="signup"
          />
        </div>
      )}

      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="relative z-10 w-full max-w-md rounded-2xl shadow-xl overflow-y-auto max-h-[92vh] px-5 py-5"
          style={{ backgroundColor: C.bg, color: C.text }}
        >

          {/* ── Top dismiss ──────────────────────────────────────────────── */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onContinueFree}
              className="text-xs hover:underline"
              style={{ color: C.muted }}
            >
              Continue with free plan →
            </button>
          </div>

          {/* ── Campaign banner (shown during intro period) ──────────────── */}
          {isIntroCampaign && (
            <div
              className="rounded-xl p-3 mb-4 text-center"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
              }}
            >
              <p className="text-white text-[11px] font-bold uppercase tracking-wider mb-0.5">
                Launch Special — Limited Time
              </p>
              <p className="text-white text-lg font-black">
                First month just $4.99
              </p>
              <p className="text-white/80 text-[11px]">
                Then $5.99/mo · Cancel anytime
              </p>
            </div>
          )}

          {/* ── Grade transformation card ─────────────────────────────────── */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
          >
            <p className="text-xs font-semibold text-center mb-3" style={{ color: C.muted }}>
              Your goal
            </p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div
                  className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-xl font-black mb-1"
                  style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                >
                  {paywallData.currentGrade}
                </div>
                <p className="text-[11px]" style={{ color: C.muted }}>Now</p>
              </div>
              <div className="px-3 text-center">
                <div className="text-xl mb-0.5" style={{ color: C.accent }}>→</div>
                <p className="text-[10px] font-bold" style={{ color: C.accent }}>
                  ~{paywallData.weeksToTarget}w
                </p>
              </div>
              <div className="text-center flex-1">
                <div
                  className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-xl font-black mb-1"
                  style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#22c55e" }}
                >
                  {paywallData.targetGrade}
                </div>
                <p className="text-[11px]" style={{ color: C.muted }}>Goal</p>
              </div>
            </div>
            <p className="text-[11px] text-center mt-3 font-medium" style={{ color: C.muted }}>
              With daily practice — achievable in ~{paywallData.weeksToTarget} weeks
            </p>
          </div>

          {/* ── Headline ─────────────────────────────────────────────────── */}
          <h1 className="text-xl font-black text-center mb-1 leading-tight" style={{ color: C.text }}>
            {paywallData.headline}
          </h1>
          <p className="text-xs text-center mb-4" style={{ color: C.muted }}>
            {paywallData.subheadline}
          </p>

          {/* ── Feature bullets ──────────────────────────────────────────── */}
          <div className="space-y-2 mb-4">
            {paywallData.bullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(6,182,212,0.12)" }}
                >
                  <svg className="w-2.5 h-2.5" style={{ color: C.accent }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs" style={{ color: C.text }}>{bullet}</span>
              </div>
            ))}
          </div>

          {/* ── Social proof testimonials ─────────────────────────────── */}
          <div className="space-y-2 mb-4">
            {[
              {
                quote: "Made flashcards from my bio notes and passed my resit. Would have failed without this.",
                author: "Tom R.",
                detail: "A-Level student",
                stars: 5,
              },
              {
                quote: "Finally stopped failing maths. Uploaded my notes, got proper questions, B on my last test.",
                author: "Aisha K.",
                detail: "Year 10",
                stars: 5,
              },
              {
                quote: "I had 40 pages of history notes the night before my exam. Got full flashcards in under a minute.",
                author: "Liam B.",
                detail: "Uni student",
                stars: 5,
              },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <svg key={s} className="w-3 h-3" style={{ color: "#f59e0b" }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: C.text }}>"{t.quote}"</p>
                <p className="text-[10px] font-semibold" style={{ color: C.muted }}>{t.author} · {t.detail}</p>
              </div>
            ))}
          </div>

          {/* ── Billing toggle ───────────────────────────────────────────── */}
          <div className="flex justify-center mb-3">
            <div
              className="inline-flex items-center gap-1 p-1 rounded-full"
              style={{ backgroundColor: "#f1f5f9", border: `1px solid ${C.border}` }}
            >
              <button
                onClick={() => setBillingInterval("month")}
                className="pw-tab px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: billingInterval === "month" ? C.card : "transparent",
                  color: billingInterval === "month" ? C.accent : C.muted,
                  boxShadow: billingInterval === "month" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("year")}
                className="pw-tab px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                style={{
                  backgroundColor: billingInterval === "year" ? C.accent : "transparent",
                  color: billingInterval === "year" ? "#ffffff" : C.muted,
                }}
              >
                Yearly
                <span
                  className="text-[10px] px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: billingInterval === "year" ? "rgba(255,255,255,0.25)" : "rgba(34,197,94,0.15)",
                    color: billingInterval === "year" ? "#fff" : "#16a34a",
                  }}
                >
                  26%
                </span>
              </button>
            </div>
          </div>

          {/* ── Price card ───────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4 mb-4 text-center"
            style={{
              backgroundColor: C.card,
              border: isIntroCampaign && billingInterval === 'month'
                ? "2px solid #f59e0b"
                : `1px solid ${C.border}`,
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-sm line-through" style={{ color: "#cbd5e1" }}>
                ${ANCHOR.toFixed(2)}
              </span>
              <span className="text-3xl font-black" style={{ color: C.text }}>${displayPrice.toFixed(2)}</span>
              <span className="text-sm" style={{ color: C.muted }}>/mo</span>
            </div>
            {billingInterval === "month" ? (
              <p className="text-[11px]" style={{ color: C.muted }}>
                {isIntroCampaign
                  ? "First month $4.99 · then $5.99/mo · cancel anytime"
                  : "Billed monthly · cancel anytime"}
              </p>
            ) : (
              <p className="text-[11px]" style={{ color: C.muted }}>Billed $52.99/year · cancel anytime</p>
            )}
          </div>

          {/* ── Error ────────────────────────────────────────────────────── */}
          {error && (
            <div
              className="mb-3 p-3 rounded-xl text-center text-xs font-medium"
              style={{ backgroundColor: "rgba(239,68,68,0.06)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}

          {/* ── CTA button ───────────────────────────────────────────────── */}
          <button
            onClick={handleGetPremium}
            disabled={isLoading}
            className="pw-cta pw-cta-pulse w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed mb-2"
            style={{
              background: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 18px rgba(6,182,212,0.3)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                Processing…
              </span>
            ) : !isLoggedIn ? (
              "Create account → get Premium"
            ) : (
              "Get Premium Access →"
            )}
          </button>

          {/* ── Continue free ────────────────────────────────────────────── */}
          <button
            onClick={onContinueFree}
            className="w-full py-2.5 text-xs font-medium mb-4 hover:underline"
            style={{ color: C.muted }}
          >
            No thanks, continue with free
          </button>

          {/* ── Trust signals ────────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-4 mb-5">
            {[
              { icon: "🔒", text: "Secure checkout" },
              { icon: "✕",  text: "Cancel anytime"  },
              { icon: "⚡", text: "Instant access"  },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[11px]">{item.icon}</span>
                <span className="text-[11px]" style={{ color: C.muted }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* ── Login link ───────────────────────────────────────────────── */}
          <p className="text-center text-xs pb-4" style={{ color: C.muted }}>
            Already have an account?{" "}
            <button
              onClick={() => setShowInlineLogin(true)}
              className="font-semibold underline"
              style={{ color: C.accent }}
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
