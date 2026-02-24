"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase, getCurrentUser } from "../utils/supabase";
import { buildAIContext as buildAIContextFromEngine } from "../utils/personalizationEngine";

// Personalization types
export type StudyLevel = "high_school" | "university" | "exam_prep" | "professional";
export type SubscriptionTier = "free" | "basic" | "pro" | "lifetime";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  
  // Personalization fields
  onboarding_completed: boolean;
  subjects?: string[]; // Changed to array for multiple subjects
  level?: StudyLevel;
  exam_date?: string; // ISO date string
  
  // Subscription & usage
  subscription_tier: SubscriptionTier;
  is_premium: boolean;
  has_used_free_generation: boolean;
  
  // Timestamps
  created_at?: string;
  onboarding_completed_at?: string;
}

interface PersonalizationContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  
  // Actions
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  completeOnboarding: (data: { subjects: string[]; level: StudyLevel; exam_date?: string }) => Promise<boolean>;
  skipOnboarding: () => Promise<boolean>;
  
  // Computed helpers
  daysUntilExam: number | null;
  getPersonalizedGreeting: () => string;
  getSubjectDisplay: () => string;
}

const defaultContext: PersonalizationContextType = {
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  needsOnboarding: false,
  refreshProfile: async () => {},
  updateProfile: async () => false,
  completeOnboarding: async () => false,
  skipOnboarding: async () => false,
  daysUntilExam: null,
  getPersonalizedGreeting: () => "Welcome",
  getSubjectDisplay: () => "your studies",
};

const PersonalizationContext = createContext<PersonalizationContextType>(defaultContext);

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check localStorage FIRST before anything else
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const skipped = localStorage.getItem("studymaxx_onboarding_skipped");
        const savedOnboarding = localStorage.getItem("studymaxx_onboarding");
        
        if (skipped === "true" || savedOnboarding) {
          // Onboarding was already done - mark it
          setOnboardingChecked(true);
        }
      } catch (error) {
        console.warn("[Personalization] localStorage not available:", error);
        // Continue without localStorage - it might be private mode
      }
    }
  }, []);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // Add timeout to prevent hanging on slow mobile networks
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 5000); // 5 second timeout
      });

      const user = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ]) as any;
      
      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // Check localStorage first before even hitting DB
      let skipped = null;
      let savedOnboarding = null;
      try {
        if (typeof window !== "undefined") {
          skipped = localStorage.getItem("studymaxx_onboarding_skipped");
          savedOnboarding = localStorage.getItem("studymaxx_onboarding");
        }
      } catch (error) {
        console.warn("[Personalization] localStorage not available in fetchProfile:", error);
      }
      const localOnboardingDone = skipped === "true" || !!savedOnboarding;

      // Add timeout to Supabase query
      const queryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      const dbTimeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: { message: 'Database query timeout' } });
        }, 5000); // 5 second timeout
      });

      const { data, error } = await Promise.race([
        queryPromise,
        dbTimeoutPromise
      ]) as any;

      if (error) {
        console.error("[Personalization] Failed to fetch profile:", error);
        // Create a minimal profile from auth user
        setProfile({
          id: user.id,
          email: user.email || "",
          onboarding_completed: localOnboardingDone,
          subscription_tier: "free",
          is_premium: false,
          has_used_free_generation: false,
        });
      } else if (data) {
        // Parse subjects - handle both string and array formats
        let subjects: string[] = [];
        if (data.subjects) {
          if (Array.isArray(data.subjects)) {
            subjects = data.subjects;
          } else if (typeof data.subjects === "string") {
            try {
              subjects = JSON.parse(data.subjects);
            } catch {
              subjects = [data.subjects];
            }
          }
        } else if (data.subject) {
          // Legacy single subject field
          subjects = [data.subject];
        }

        setProfile({
          id: data.id,
          email: data.email,
          name: data.name,
          avatar_url: data.avatar_url,
          onboarding_completed: localOnboardingDone || data.onboarding_completed || false,
          subjects,
          level: data.level,
          exam_date: data.exam_date,
          subscription_tier: data.subscription_tier || "free",
          is_premium: data.is_premium || false,
          has_used_free_generation: data.has_used_free_generation || false,
          created_at: data.created_at,
          onboarding_completed_at: data.onboarding_completed_at,
        });
      }
    } catch (error) {
      console.error("[Personalization] Error fetching profile:", error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load profile on mount and auth changes
  useEffect(() => {
    fetchProfile();

    if (!supabase) return;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchProfile();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Update profile in Supabase
  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!supabase || !profile) return false;

    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      // Map profile fields to db fields
      if (updates.subjects !== undefined) {
        dbUpdates.subjects = JSON.stringify(updates.subjects);
      }
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.exam_date !== undefined) dbUpdates.exam_date = updates.exam_date || null;
      if (updates.onboarding_completed !== undefined) dbUpdates.onboarding_completed = updates.onboarding_completed;

      const { error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", profile.id);

      if (error) {
        console.error("[Personalization] Failed to update profile:", error);
        return false;
      }

      // Update local state
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return true;
    } catch (error) {
      console.error("[Personalization] Error updating profile:", error);
      return false;
    }
  }, [profile]);

  // Complete onboarding flow
  const completeOnboarding = useCallback(async (data: {
    subjects: string[];
    level: StudyLevel;
    exam_date?: string;
  }): Promise<boolean> => {
    if (!profile) return false;

    // Always update local state first (graceful degradation)
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            subjects: data.subjects,
            level: data.level,
            exam_date: data.exam_date,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          }
        : null
    );

    // Store in localStorage as backup
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("studymaxx_onboarding", JSON.stringify({
          subjects: data.subjects,
          level: data.level,
          exam_date: data.exam_date,
          completed_at: new Date().toISOString(),
        }));
      } catch (error) {
        console.warn("[Personalization] Could not save onboarding to localStorage:", error);
      }
    }

    // Try to update DB - write actual personalization data
    if (supabase) {
      try {
        const { error } = await supabase
          .from("users")
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            subjects: JSON.stringify(data.subjects),
            level: data.level,
            exam_date: data.exam_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
        
        if (error) {
          console.warn("[Personalization] Could not update DB:", error.message);
        }
      } catch (e) {
        console.warn("[Personalization] Could not update DB");
      }
    }

    return true;
  }, [profile]);

  // Skip onboarding
  const skipOnboarding = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;

    // Update local state
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          }
        : null
    );

    // Store skip in localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("studymaxx_onboarding_skipped", "true");
      } catch (error) {
        console.warn("[Personalization] Could not save skip to localStorage:", error);
      }
    }

    return true;
  }, [profile]);

  // Check if onboarding was skipped in localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && profile && !profile.onboarding_completed) {
      try {
        const skipped = localStorage.getItem("studymaxx_onboarding_skipped");
        const savedOnboarding = localStorage.getItem("studymaxx_onboarding");
        
        if (skipped === "true" || savedOnboarding) {
          setProfile((prev) => prev ? { ...prev, onboarding_completed: true } : null);
        }
      } catch (error) {
        console.warn("[Personalization] Could not read localStorage in check effect:", error);
      }
    }
  }, [profile?.id]);

  // Calculate days until exam
  const daysUntilExam = React.useMemo(() => {
    if (!profile?.exam_date) return null;
    
    const examDate = new Date(profile.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : null;
  }, [profile?.exam_date]);

  // Get personalized greeting — uses Grade Ascend name if available
  const getPersonalizedGreeting = useCallback(() => {
    let name: string | undefined;
    
    // Try Grade Ascend data first
    if (typeof window !== 'undefined') {
      try {
        const savedName = localStorage.getItem('studymaxx_user_name');
        if (savedName) name = savedName;
      } catch { /* ignore */ }
    }
    
    // Fall back to profile
    if (!name && profile?.name) {
      name = profile.name.split(" ")[0];
    }
    
    const hour = new Date().getHours();
    let timeGreeting = "Hello";
    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 17) timeGreeting = "Good afternoon";
    else timeGreeting = "Good evening";
    
    return name ? `${timeGreeting}, ${name}` : timeGreeting;
  }, [profile]);

  // Get subject display text
  const getSubjectDisplay = useCallback(() => {
    if (!profile?.subjects || profile.subjects.length === 0) return "your studies";
    if (profile.subjects.length === 1) return profile.subjects[0];
    if (profile.subjects.length === 2) return profile.subjects.join(" & ");
    return `${profile.subjects[0]} and ${profile.subjects.length - 1} more`;
  }, [profile?.subjects]);

  const value: PersonalizationContextType = {
    profile,
    isLoading,
    isAuthenticated: !!profile,
    needsOnboarding: !!profile && !profile.onboarding_completed && !onboardingChecked,
    refreshProfile: fetchProfile,
    updateProfile,
    completeOnboarding,
    skipOnboarding,
    daysUntilExam,
    getPersonalizedGreeting,
    getSubjectDisplay,
  };

  return (
    <PersonalizationContext.Provider value={value}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error("usePersonalization must be used within a PersonalizationProvider");
  }
  return context;
}

export function useAIPromptContext() {
  const { profile, daysUntilExam } = usePersonalization();

  return React.useMemo(() => {
    // First try Grade Ascend personalization data (new onboarding)
    if (typeof window !== 'undefined') {
      try {
        const ascendData = localStorage.getItem('studymaxx_grade_ascend_data');
        const personalizationData = localStorage.getItem('studymaxx_personalization');
        if (ascendData && personalizationData) {
          const onboardingData = JSON.parse(ascendData);
          const profile_ = JSON.parse(personalizationData);
          const context = buildAIContextFromEngine(onboardingData, profile_);
          if (context) return context;
        }
      } catch {
        // Fall through to legacy
      }
    }

    // Legacy personalization from old onboarding
    if (!profile) return "";

    const parts: string[] = [];

    if (profile.subjects && profile.subjects.length > 0) {
      parts.push(`Subjects: ${profile.subjects.join(", ")}`);
    }

    if (profile.level) {
      const levelMap: Record<StudyLevel, string> = {
        high_school: "high school",
        university: "university/college",
        exam_prep: "exam preparation",
        professional: "professional/certification",
      };
      parts.push(`Level: ${levelMap[profile.level]}`);
    }

    if (daysUntilExam && daysUntilExam <= 30) {
      parts.push(`Exam in: ${daysUntilExam} days (prioritize key concepts)`);
    }

    if (parts.length === 0) return "";

    return `\nUSER CONTEXT:\n- ${parts.join("\n- ")}\n`;
  }, [profile, daysUntilExam]);
}
