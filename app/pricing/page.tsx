"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../utils/supabase";
import { useSettings } from "../contexts/SettingsContext";

// Custom SVG Icons
const AlertTriangleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = ({ color }: { color: string }) => (
  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isPremium, setIsPremium] = useState(false);
  const [isGrandfathered, setIsGrandfathered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const promoCode = searchParams.get('campaign') === 'email50' ? '5dgCe1PK' : null;

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/premium/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium);
        setIsGrandfathered(data.isGrandfathered || false);
      }
    } catch (error) {
      console.error('[PricingPage] Error checking premium:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (plan: 'free' | 'premium') => {
    if (plan === 'free') {
      router.push('/');
      return;
    }

    setIsCheckoutLoading(true);

    try {
      if (!supabase) {
        console.error('[Pricing] Supabase not initialized');
        alert('App not fully loaded. Please refresh and try again.');
        setIsCheckoutLoading(false);
        return;
      }

      console.log('[Pricing] Checking user session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Pricing] Session error:', sessionError);
        alert('Could not verify your session. Please sign in again.');
        setIsCheckoutLoading(false);
        return;
      }
      
      if (!session) {
        console.log('[Pricing] No active session - redirecting to signin');
        router.push('/?signin=true');
        setIsCheckoutLoading(false);
        return;
      }

      console.log('[Pricing] Session found for user:', session.user?.email);
      console.log('[Pricing] Sending checkout request with promo:', promoCode);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          interval: billingInterval,
          promoCode: promoCode
        }),
      });

      console.log('[Pricing] Checkout response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[Pricing] Checkout session created:', data.sessionId);
        
        if (data.url) {
          console.log('[Pricing] Redirecting to Stripe checkout URL');
          window.location.href = data.url;
        } else {
          console.error('[Pricing] No checkout URL in response');
          alert('Failed to create checkout session - no URL returned. Please try again.');
          setIsCheckoutLoading(false);
        }
      } else {
        const errorData = await response.json();
        console.error('[Pricing] Checkout API error:', errorData);
        alert(`Error: ${errorData.error || 'Failed to create checkout session'}`);
        setIsCheckoutLoading(false);
      }
    } catch (error: any) {
      console.error('[Pricing] Checkout error:', error);
      alert(`An error occurred: ${error.message || 'Please try again.'}`);
      setIsCheckoutLoading(false);
    }
  };

  // Theme colors
  const bgColor = isDarkMode ? '#1a1a2e' : '#f1f5f9';
  const textPrimary = isDarkMode ? '#ffffff' : '#0f172a';
  const textSecondary = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const headerBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const featureText = isDarkMode ? '#e2e8f0' : '#334155';
  const freeCheckColor = isDarkMode ? '#475569' : '#94a3b8';
  const freeFeatureColor = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)' }} />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full blur-[100px]" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10" style={{ borderBottom: `1px solid ${headerBorder}` }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold cursor-pointer"
            onClick={() => router.push('/')}
          >
            <span style={{ color: '#06b6d4' }}>Study</span>
            <span style={{ color: textPrimary }}>Maxx</span>
          </h1>
          <button
            onClick={() => {
              // Always go to dashboard if logged in, otherwise home
              router.push('/');
            }}
            className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center gap-2 border"
            style={{ 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff',
              color: isDarkMode ? '#e2e8f0' : '#0f172a',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.12)' : '#f1f5f9';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back to App
          </button>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-16">
        {/* Premium Status Banner for existing premium users */}
        {!isLoading && isPremium && (
          <div className="mb-8 text-center">
            <div 
              className="inline-block px-6 py-4 rounded-2xl shadow-lg"
              style={{
                background: isGrandfathered
                  ? '#f59e0b'
                  : '#06b6d4'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-bold text-lg flex items-center gap-2" style={{ color: '#ffffff' }}>
                    {isGrandfathered && (
                      <span className="text-2xl">🏆</span>
                    )}
                    {isGrandfathered ? "Early Bird Premium Member!" : "You're a Premium Member!"}
                  </div>
                  <div className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {isGrandfathered 
                      ? "You have lifetime access at the early bird price — thank you for being an original supporter!" 
                      : "You have full access to all StudyMaxx features"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-8">
          {promoCode && (
            <div className="mb-4 inline-block px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', margin: 0 }}>Special Campaign Price Applied: {promoCode}</p>
            </div>
          )}
          <h2 className="text-4xl font-bold mb-4" style={{ color: textPrimary }}>
            Upgrade to <span style={{ color: '#22d3ee' }}>Premium</span>
          </h2>
          <p className="text-lg mb-2" style={{ color: textSecondary }}>
            {promoCode ? '50% off your first month only' : 'Unlimited study sets, AI tutor, PDF uploads, YouTube & more'}
          </p>
          {!promoCode && (
            <p className="text-sm mb-6 font-medium" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
              Less than a coffee a week &nbsp;·&nbsp; Cancel anytime
            </p>
          )}
          
          {/* Billing Toggle */}
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setBillingInterval('month')}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={billingInterval === 'month' ? { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0', color: textPrimary } : { color: textSecondary }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className="px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2"
                style={billingInterval === 'year' ? { backgroundColor: '#06b6d4', color: '#fff', boxShadow: '0 4px 12px rgba(6,182,212,0.35)' } : { color: textSecondary }}
              >
                Yearly <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: billingInterval === 'year' ? 'rgba(255,255,255,0.25)' : 'rgba(34, 197, 94, 0.2)', color: billingInterval === 'year' ? '#fff' : '#22c55e' }}>SAVE $18</span>
              </button>
            </div>
            {billingInterval === 'month' && (
              <p className="text-xs" style={{ color: '#22c55e' }}>👆 Switch to yearly and save $18.89/year</p>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div 
            className="relative overflow-hidden rounded-2xl order-2 md:order-1"
            style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}
          >
            <div className="p-5 sm:p-8">
              <h3 className="text-2xl font-bold mb-3" style={{ color: textPrimary }}>
                Free
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold" style={{ color: textPrimary }}>
                  $0
                </span>
                <span className="text-sm" style={{ color: textSecondary }}>
                  /month
                </span>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  "1 study set to try it out",
                  "Up to 20 cards per set",
                  "Basic flashcard & quiz modes",
                  "Paste notes only (no file upload)",
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckIcon color={freeCheckColor} />
                    <span className="text-sm" style={{ color: freeFeatureColor }}>{feature}</span>
                  </div>
                ))}

                <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: isDarkMode ? '#ef4444' : '#dc2626' }}>Not included:</p>
                  {[
                    "No PDF, image, or YouTube uploads",
                    "No AI chat assistant",
                    "No cross-device sync",
                    "No match game mode",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 mb-2">
                      <XIcon color={isDarkMode ? '#475569' : '#cbd5e1'} />
                      <span className="text-sm" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan('free')}
                className="w-full py-3 px-6 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: textPrimary, border: `1px solid ${cardBorder}` }}
              >
                Get Started Free
              </button>
            </div>
          </div>

          {/* Premium Plan */}
          <div 
            className="relative overflow-hidden rounded-2xl order-1 md:order-2"
            style={{ 
              background: isDarkMode 
                ? 'rgba(6, 182, 212, 0.08)' 
                : 'rgba(6, 182, 212, 0.03)',
              border: '2px solid rgba(6, 182, 212, 0.4)',
              boxShadow: isDarkMode ? '0 8px 32px rgba(6, 182, 212, 0.1)' : '0 8px 32px rgba(6, 182, 212, 0.12)',
            }}
          >
            <div 
              className="absolute top-0 right-0 px-4 py-1 text-xs font-bold rounded-bl-lg"
              style={{ backgroundColor: '#06b6d4', color: '#ffffff' }}
            >
              MOST POPULAR
            </div>
            
            <div className="p-5 sm:p-8">
              <h3 className="text-2xl font-bold mb-1" style={{ color: '#22d3ee' }}>
                Premium
              </h3>
              <p className="text-xs mb-3" style={{ color: textSecondary }}>
                Everything you need to ace your studies
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                {promoCode ? (
                  <>
                    <span className="text-2xl" style={{ color: textSecondary, textDecoration: 'line-through' }}>
                      {billingInterval === 'year' ? '$4.42' : '$5.99'}
                    </span>
                    <span className="mx-1" style={{ color: textSecondary }}>→</span>
                    <span className="text-4xl font-bold" style={{ color: '#22c55e' }}>
                      $2.99
                    </span>
                  </>
                ) : billingInterval === 'year' ? (
                  <>
                    <span className="text-2xl line-through" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>$5.99</span>
                    <span className="text-4xl font-bold" style={{ color: '#22d3ee' }}>$4.42</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold" style={{ color: '#22d3ee' }}>$5.99</span>
                )}
                <span className="text-sm" style={{ color: textSecondary }}>/month</span>
              </div>
              {!promoCode && billingInterval === 'year' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>YEARLY PLAN</span>
                  <span className="text-xs" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>Billed as $52.99/year</span>
                </div>
              )}
              <p className="text-xs mb-6" style={{ color: promoCode ? '#22c55e' : (billingInterval === 'year' ? '#22c55e' : isDarkMode ? '#64748b' : '#94a3b8') }}>
                {promoCode ? 'Then $4.42/mo (yearly) or $5.99/mo. Cancel anytime.' : (billingInterval === 'year' ? 'You save $18.89 compared to paying monthly — that\'s 2 months free.' : 'Switch to yearly and pay only $4.42/mo — save $18.89/year.')}
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { text: "Unlimited study sets & cards", bold: true },
                  { text: "Upload PDFs, images, PowerPoints & Word docs" },
                  { text: "Generate from YouTube videos & any website" },
                  { text: "AI study coach \u2014 ask questions about your material" },
                  { text: "Quiz mode with multiple choice & written answers" },
                  { text: "Match memory game for active recall" },
                  { text: "Choose difficulty: Easy, Medium, or Hard" },
                  { text: "Up to 50 cards per set (vs 10 free)" },
                  { text: "17 output languages supported" },
                  { text: "Cross-device sync \u2014 study on any device" },
                  { text: "Priority support & all future features" },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckIcon color="#22d3ee" />
                    <span className={`text-sm ${feature.bold ? 'font-bold' : ''}`} style={{ color: feature.bold ? textPrimary : featureText }}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan('premium')}
                disabled={isCheckoutLoading}
                className="w-full py-3 px-6 font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: '#06b6d4', color: '#ffffff', boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.4)' }}
              >
                {isCheckoutLoading ? 'Processing...' : (billingInterval === 'year' ? 'Get Premium — $4.42/mo (billed $52.99/yr)' : 'Get Premium — $5.99/mo')}
              </button>
              <p className="text-center text-xs mt-3" style={{ color: textSecondary }}>
                Cancel anytime — no commitment
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-xs" style={{ color: '#22c55e' }}>Secured by Stripe — bank-level encryption</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-center text-xl font-bold mb-6" style={{ color: textPrimary }}>Common Questions</h3>
          <div className="space-y-3 mb-16">
            {[
              { q: "Can I cancel anytime?", a: "Yes. Cancel from your account settings at any time. Your Premium access continues until the end of the billing period — no extra charges, no hassle." },
              { q: "What happens to my study sets if I cancel?", a: "Your sets stay saved forever. You just can't create new ones beyond the free limit, and file upload access pauses until you re-subscribe." },
              { q: "Is it cheaper than Quizlet?", a: "Yes. Quizlet Plus is $7.99/month. StudyMaxx Premium is $5.99/month and does things Quizlet can't — like generating sets from PDFs, images, and YouTube videos using AI." },
              { q: "Do I need a credit card for the free plan?", a: "No. The free plan needs zero payment info. You only enter card details when you decide to upgrade." },
              { q: "Monthly vs yearly — what's the difference?", a: "Yearly is $52.99 billed once, which works out to $4.42/month. That saves you $18.89 compared to paying monthly — essentially 2 months free." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-5" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', border: `1px solid ${cardBorder}` }}>
                <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary }}>{item.q}</h4>
                <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Section */}
        <div className="mt-0 max-w-3xl mx-auto">
          <h3 className="text-center text-xl font-bold mb-6" style={{ color: textPrimary }}>Why go Premium?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Upload anything", desc: "PDFs, images, PowerPoints, Word docs — we turn them into study sets automatically." },
              { title: "YouTube to flashcards", desc: "Paste a YouTube link and get flashcards and quizzes from the video content." },
              { title: "AI study coach", desc: "Ask the AI about your material, get explanations, and study tips in real time." },
              { title: "All study modes", desc: "Flashcards, multiple-choice quiz, written quiz, and match game — all from one set." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-5" style={{ backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.03)', border: `1px solid ${isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)'}` }}>
                <h4 className="text-sm font-bold mb-1.5" style={{ color: '#22d3ee' }}>{item.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{item.desc}</p>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-center mt-8" style={{ color: textSecondary }}>
            Cancel anytime — no commitment. Your subscription continues until the end of the billing period.
          </p>
          
          {/* Trust Section */}
          <div className="mt-10 pt-8 border-t flex flex-col items-center gap-4" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-xs font-medium" style={{ color: textSecondary }}>256-bit SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span className="text-xs font-medium" style={{ color: textSecondary }}>Powered by Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span className="text-xs font-medium" style={{ color: textSecondary }}>Cancel anytime</span>
              </div>
            </div>
            <p className="text-xs text-center" style={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>
              Your payment is processed securely by Stripe. We never see or store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
