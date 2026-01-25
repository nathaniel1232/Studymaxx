"use client";

import { useState, useEffect } from "react";

const COOKIE_CONSENT_KEY = "studymaxx-cookie-consent";

export type CookieConsent = "accepted" | "declined" | null;

// Helper function to get consent status
export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (consent === "accepted" || consent === "declined") return consent;
  return null;
}

// Helper to check if analytics/tracking is allowed
export function isTrackingAllowed(): boolean {
  return getCookieConsent() === "accepted";
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setShowBanner(false);
    
    // Enable analytics/tracking here
    // This allows Vercel Analytics and any other tracking to work
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: { accepted: true } }));
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setShowBanner(false);
    
    // Disable analytics/tracking
    // Clear any existing tracking cookies
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: { accepted: false } }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-2 sm:p-4">
      <div 
        className="max-w-4xl mx-auto rounded-xl shadow-2xl p-4 sm:p-6"
        style={{
          backgroundColor: '#ffffff',
          border: '2px solid #e2e8f0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Top row: Icon and Message */}
          <div className="flex items-start gap-3">
            {/* Cookie Icon */}
            <div 
              className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#fef3c7' }}
            >
              <span className="text-xl sm:text-2xl">🍪</span>
            </div>
            
            {/* Message */}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-base sm:text-lg font-bold mb-1"
                style={{ color: '#1e293b' }}
              >
                We use cookies
              </h3>
              <p 
                className="text-xs sm:text-sm"
                style={{ color: '#64748b' }}
              >
                We use cookies to save your preferences and improve your experience.
              </p>
            </div>
          </div>
          
          {/* Buttons - Stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleDecline}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '2px solid #cbd5e1'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: '2px solid #0f172a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0f172a';
              }}
            >
              Accept Cookies
            </button>
          </div>
        </div>
        
        {/* Privacy Link */}
        <div className="mt-3 text-center">
          <a 
            href="/privacy" 
            className="text-xs underline transition-colors"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
