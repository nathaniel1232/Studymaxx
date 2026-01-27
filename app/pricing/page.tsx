"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function PricingPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<'yearly'>('yearly');
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

    // Redirect to Stripe checkout for Premium Early Bird
    try {
      if (!supabase) {
        alert('Please sign in first to purchase Premium');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in first to purchase Premium');
        router.push('/?signin=true');
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          interval: 'month'
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        } else {
          alert('Failed to create checkout session - no URL returned');
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to create checkout session:', errorData);
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold cursor-pointer"
            onClick={() => router.push('/')}
            style={{ 
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            StudyMaxx
          </h1>
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            size="sm"
          >
            Back to App
          </Button>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Premium Status Banner for existing premium users */}
        {!isLoading && isPremium && (
          <div className="mb-8 text-center">
            <div className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div className="text-left">
                  <div className="font-bold text-lg">You're a Premium Early Bird!</div>
                  <div className="text-sm opacity-90">Keep this $2.99/month price as long as you stay subscribed</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Urgency Banner */}
        {!isPremium && (
          <div className="mb-8 text-center">
            <div className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white mb-4">
              <span className="text-sm font-bold">⚠️ EARLY BIRD SPECIAL - ENDING FEBRUARY 10, 2026</span>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Lock In Early Bird Pricing
          </h2>
          <p className="text-lg mb-2" style={{ color: 'var(--muted-foreground)' }}>
            Get premium now at <span className="font-bold text-emerald-600 dark:text-emerald-400">$2.99/month</span> - Prices increase on February 10th
          </p>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            Early birds keep this low price as long as they stay subscribed
          </p>
          <p className="text-sm mt-4 text-amber-600 dark:text-amber-400">
            This plan is worth more than 3x the price of what we're charging
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700" style={{ background: 'var(--surface)' }}>
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
                Free
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
                  $0
                </span>
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  /month
                </span>
              </div>

              <div className="space-y-3 mb-8 min-h-[200px]">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    3 study sets per day
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    Up to 10 cards per set
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    Paste notes mode
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    All study modes
                  </span>
                </div>
              </div>

              <Button
                onClick={() => handleSelectPlan('free')}
                className="w-full font-bold transition-all bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Get Started
              </Button>
            </div>
          </div>

          {/* Premium Early Bird Plan */}
          <div className="relative overflow-hidden rounded-lg border-2 border-emerald-500 shadow-2xl" style={{
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.05) 0%, rgba(19, 78, 74, 0.05) 100%)'
          }}>
            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 text-xs font-bold">
              EARLY BIRD SPECIAL
            </div>
            
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-1 text-emerald-600 dark:text-emerald-400">
                Premium Early Bird
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 font-bold mb-3">
                Prices increase on Feb 10 - Lock in now!
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  $2.99
                </span>
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  /month
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-6">
                Keep this price as long as you stay subscribed!
              </p>

              <div className="space-y-3 mb-8 min-h-[200px]">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                    Unlimited study sets
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    All current & upcoming features
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    Higher quality AI generations
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    Priority support & fast updates
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    Cross-device sync
                  </span>
                </div>
              </div>

              <Button
                onClick={() => handleSelectPlan('premium')}
                className="w-full font-bold transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
              >
                Lock In Early Bird Price
              </Button>
              <p className="text-center text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                Cancel anytime
              </p>
            </div>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center max-w-3xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold mb-3 text-yellow-800 dark:text-yellow-300">
              Why Early Bird Pricing?
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
              Get full access to all premium features and future updates. 
              Early supporters lock in this special launch price as long as they stay subscribed.
            </p>
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
              After February 10, 2026: Premium price increases - but early birds keep $2.99/month as long as they stay subscribed!
            </p>
          </div>
          
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            All plans include full access to study modes, test modes, and mobile sync. Early birds keep their low price as long as they stay subscribed.
          </p>
        </div>
      </div>
    </div>
  );
}
