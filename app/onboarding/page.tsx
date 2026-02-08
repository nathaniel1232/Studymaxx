"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePersonalization } from "../contexts/PersonalizationContext";
import TurboOnboarding from "../components/TurboOnboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, needsOnboarding } = usePersonalization();

  useEffect(() => {
    // Check localStorage first
    if (typeof window !== "undefined") {
      const skipped = localStorage.getItem("studymaxx_onboarding_skipped");
      const savedOnboarding = localStorage.getItem("studymaxx_onboarding");
      
      if (skipped === "true" || savedOnboarding) {
        // Already done onboarding - go to dashboard
        router.push("/?view=create");
        return;
      }
    }

    // If not loading and not authenticated, redirect to home
    if (!isLoading && !isAuthenticated) {
      router.push("/");
      return;
    }

    // If already completed onboarding, redirect to dashboard
    if (!isLoading && isAuthenticated && !needsOnboarding) {
      router.push("/?view=create");
      return;
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: '#5f6368' }} className="font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or doesn't need onboarding, show nothing (will redirect)
  if (!isAuthenticated || !needsOnboarding) {
    return null;
  }

  // Show Turbo-style onboarding
  return (
    <TurboOnboarding 
      onComplete={() => {
        // Redirect to dashboard (create view) after completing onboarding
        router.push("/?view=create");
      }} 
    />
  );
}
