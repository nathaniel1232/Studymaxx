"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

const COOKIE_CONSENT_KEY = "studymaxx-cookie-consent";

export type CookieConsent = "accepted" | "declined" | null;

// Helper function to get consent status
export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === "accepted" || consent === "declined") return consent;
    return null;
  } catch (error) {
    console.warn("[CookieConsent] localStorage not available:", error);
    return null;
  }
}

// Helper to check if analytics/tracking is allowed
export function isTrackingAllowed(): boolean {
  return getCookieConsent() === "accepted";
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    // Check if user has already consented
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Small delay to prevent flash on page load
        const timer = setTimeout(() => setShowBanner(true), 500);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.warn("[CookieConsent] localStorage not available on mount:", error);
      // Show banner anyway if we can't check localStorage
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch (error) {
      console.warn("[CookieConsent] localStorage not available on accept:", error);
    }
    setShowBanner(false);
    
    // Enable analytics/tracking here
    // This allows Vercel Analytics and any other tracking to work
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: { accepted: true } }));
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    } catch (error) {
      console.warn("[CookieConsent] localStorage not available on decline:", error);
    }
    setShowBanner(false);
    
    // Disable analytics/tracking
    // Clear any existing tracking cookies
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: { accepted: false } }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-2 sm:p-3">
      <div 
        className="max-w-md mx-auto rounded-xl shadow-lg p-3 sm:p-4"
        style={{
          backgroundColor: isDarkMode ? '#1e1e38' : '#ffffff',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
          boxShadow: isDarkMode ? '0 -4px 20px rgba(0, 0, 0, 0.4)' : '0 -4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Compact single row on mobile, two rows on very small screens */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Message - compact */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">🍪</span>
            <p className="text-xs sm:text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
              We use cookies for a better experience.
              <a 
                href="/privacy" 
                className="ml-1 underline hover:no-underline"
                style={{ color: '#1a73e8' }}
              >
                Learn more
              </a>
            </p>
          </div>
          
          {/* Buttons - inline */}
          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={handleDecline}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                color: isDarkMode ? '#9aa0a6' : '#64748b',
              }}
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110 active:scale-95"
              style={{
                backgroundColor: '#1a73e8',
                color: '#ffffff',
              }}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

