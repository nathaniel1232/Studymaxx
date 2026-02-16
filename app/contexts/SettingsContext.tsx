"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type Language = "en";
export type GradeSystem = "A-F" | "1-6" | "percentage";

export interface AppSettings {
  theme: Theme;
  language: Language;
  gradeSystem: GradeSystem;
}

interface SettingsContextType {
  settings: AppSettings;
  updateTheme: (theme: Theme) => void;
  updateLanguage: (language: Language) => void;
  updateGradeSystem: (system: GradeSystem) => void;
}

const defaultSettings: AppSettings = {
  theme: "light",
  language: "en",
  gradeSystem: "A-F"
};

const SETTINGS_KEY = "studymaxx-settings";

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Load settings from localStorage
 */
function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    
    const parsed = JSON.parse(stored);
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return defaultSettings;
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  
  const root = document.documentElement;
  
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    root.classList.toggle("light", !prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyTheme(loaded.theme);
    setIsInitialized(true);

    // Listen for system theme changes
    if (loaded.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const updateTheme = (theme: Theme) => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    saveSettings(newSettings);
    applyTheme(theme);

    // Update system theme listener
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      mediaQuery.addEventListener("change", handler);
    }
  };

  const updateLanguage = (language: Language) => {
    const newSettings = { ...settings, language };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const updateGradeSystem = (gradeSystem: GradeSystem) => {
    const newSettings = { ...settings, gradeSystem };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Don't render children until settings are loaded to avoid flash
  if (!isInitialized) {
    return null;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateTheme,
        updateLanguage,
        updateGradeSystem
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings context
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

/**
 * Get translated text based on current language
 */
export function useTranslation() {
  const { settings } = useSettings();
  
  return (key: string, variables?: Record<string, string>): string => {
    const translations: Record<string, Record<Language, string>> = {
      // Navigation
      "home": { en: "Home" },
      "create_new": { en: "Create new" },
      "my_sets": { en: "My Sets" },
      "settings": { en: "Settings" },
      "back": { en: "Back" },
      "continue": { en: "Continue" },
      "loading": { en: "Loading..." },
      
      // Study modes
      "study": { en: "Study" },
      "test_yourself": { en: "Test Yourself" },
      "quiz": { en: "Quiz" },
      "flashcards": { en: "Flashcards" },
      
      // Flashcard grading
      "bad": { en: "Bad" },
      "ok": { en: "OK" },
      "good": { en: "Good" },
      "weak": { en: "Weak" },
      "medium": { en: "Medium" },
      "mastered": { en: "Mastered" },
      "review_summary": { en: "Review Summary" },
      "weak_cards": { en: "Weak cards" },
      "medium_cards": { en: "Medium cards" },
      "mastered_cards": { en: "Mastered cards" },
      "continue_to_test": { en: "Continue to test" },
      "review_weak_first": { en: "Review weak cards first" },
      
      // Test flow
      "shuffle": { en: "Shuffle" },
      "shuffle_disabled_test": { en: "Shuffle disabled during test" },
      "retake_test": { en: "Retake test" },
      "resume": { en: "Resume" },
      "review_mistakes": { en: "Review mistakes" },
      "study_mistakes": { en: "Study mistakes" },
      "try_again": { en: "Try again" },
      "retake_quiz": { en: "Retake quiz" },
      "perfect": { en: "Perfect!" },
      "perfect_score": { en: "Perfect score!" },
      "quiz_complete": { en: "Quiz complete!" },
      "quiz_ended": { en: "Quiz ended" },
      "nice_work": { en: "Nice work!" },
      "lets_review": { en: "Let's review" },
      "questions_answered": { en: "questions answered" },
      "correct": { en: "correct" },
      "best_streak": { en: "Best streak" },
      "max_streak": { en: "Max streak" },
      "study_mode": { en: "Study mode" },
      "all_done": { en: "All done!" },
      "youve_reviewed_all": { en: "You've reviewed all the cards" },
      "study_again": { en: "Study again" },
      "previous": { en: "Previous" },
      "next": { en: "Next" },
      "got_it": { en: "Got it" },
      "question": { en: "Question" },
      "answered": { en: "answered" },
      "select_correct_answer": { en: "Select the correct answer:" },
      "click_to_reveal": { en: "Click to reveal answer" },
      "click_to_see_question": { en: "Click to see question" },
      "answer": { en: "Answer" },
      "lives": { en: "Lives" },
      "streak": { en: "Streak" },
      "progress": { en: "Progress" },
      
      // Create flow
      "subject": { en: "Subject" },
      "grade": { en: "Grade" },
      "what_studying_from": { en: "What are you studying from?" },
      "add_material_for": { en: "Add your learning material for" },
      "notes": { en: "Notes" },
      "paste_notes": { en: "Paste or type your study notes" },
      "paste_or_type_text": { en: "Paste or type text" },
      "upload_docx_file": { en: "Upload .docx file" },
      "upload_image_file": { en: "Upload Image" },
      "difficulty_level": { en: "Difficulty Level" },
      "number_of_flashcards": { en: "Number of Flashcards" },
      "pdf_document": { en: "PDF or Document" },
      "upload_file": { en: "Upload a file (PDF, DOCX)" },
      "youtube_video": { en: "YouTube Video" },
      "learn_from_video": { en: "Learn from video transcript" },
      "image": { en: "Image" },
      "upload_image_ocr": { en: "Upload image with text (OCR)" },
      "recommended": { en: "Recommended" },
      "change": { en: "Change" },
      "paste_notes_here": { en: "Paste your notes here..." },
      "click_to_upload": { en: "Click to upload" },
      "pdf_or_docx": { en: "PDF or DOCX" },
      "click_to_upload_image": { en: "Click to upload image" },
      "jpg_png_formats": { en: "JPG, PNG, or other image formats" },
      "click_to_change": { en: "Click to change file" },
      "characters_extracted": { en: "characters extracted" },
      "processing": { en: "Processing..." },
      "what_grade_aiming": { en: "What grade are you aiming for?" },
      "create_right_amount": { en: "We'll create the right amount of study material for your goal" },
      "generate_study_set": { en: "Generate Study Set" },
      "creating_study_set": { en: "Creating your study set..." },
      "usually_takes": { en: "This usually takes around a minute" },
      "analyzing_material": { en: "Analyzing your {subject} material" },
      "creating_flashcards_grade": { en: "Creating flashcards for grade {grade}" },
      "generating_quiz": { en: "Generating quiz questions" },
      "while_you_wait": { en: "While you wait..." },
      "excellence": { en: "Excellence" },
      "master_every_detail": { en: "Master every detail" },
      "very_good": { en: "Very Good" },
      "strong_understanding": { en: "Strong understanding" },
      "solid_foundations": { en: "Solid foundations" },
      "satisfactory": { en: "Satisfactory" },
      "core_concepts": { en: "Core concepts" },
      "passing": { en: "Passing" },
      "essential_knowledge": { en: "Essential knowledge" },
      "absolute_mastery": { en: "Absolute mastery" },
      "please_enter_subject": { en: "Please enter a subject" },
      "please_choose_material": { en: "Please choose a material type" },
      "please_add_notes": { en: "Please add your notes" },
      "please_add_youtube": { en: "Please add a YouTube URL" },
      "please_upload_file": { en: "Please upload a file" },
      "please_choose_grade": { en: "Please choose your target grade" },
      "enter_your_age": { en: "Enter your age..." },
      "create_study_set": { en: "Create Study Set" },
      "what_subject": { en: "What subject are you studying?" },
      "helps_create": { en: "This helps us create relevant study materials" },
      "type_subject": { en: "Type a subject..." },
      "choose_common": { en: "Or choose a common subject:" },
      "choose_material": { en: "Choose your learning material" },
      "target_grade": { en: "What's your target grade?" },
      "determines_depth": { en: "This determines the depth and quantity of flashcards" },
      
      // Home page
      "learn_smarter": { en: "LEARN SMARTER, NOT LONGER" },
      "turn_notes": { en: "Turn your notes into something you can actually learn from" },
      "notes_to_tests": { en: "Notes → Flashcards → Tests. Study with confidence." },
      "create_flashcards": { en: "Create flashcards" },
      "upload_notes": { en: "Create smart flashcards instantly from your study material." },
      "test_yourself_desc": { en: "Quiz mode with smart multiple-choice questions that actually challenge you." },
      "track_progress": { en: "Track progress" },
      "build_streaks": { en: "Build streaks, earn lives, and watch yourself get better every day." },
      "did_you_know": { en: "Did you know?" },
      "your_study_sets": { en: "Your study sets" },
      "view_all": { en: "View all" },
      "no_saved_sets": { en: "No saved sets yet" },
      "create_to_start": { en: "Create some flashcards to get started" },
      
      // Buttons
      "delete": { en: "Delete" },
      "save": { en: "Save" },
      "share": { en: "Share" },
      "copy_link": { en: "Copy Link" },
      "close": { en: "Close" },
      
      // Settings
      "appearance": { en: "Appearance" },
      "theme": { en: "Theme" },
      "light": { en: "Light" },
      "dark": { en: "Dark" },
      "system": { en: "System" },
      "language": { en: "Language" },
      "english": { en: "English" },
      "personalize": { en: "Personalize your study experience" },
      "settings_saved": { en: "Settings saved" },
      
      // SettingsView specific
      "how_studymaxx_works": { en: "How StudyMaxx Works" },
      "built_on_science": { en: "StudyMaxx is built on proven learning science. Here's why it works:" },
      "our_approach": { en: "Our approach" },
      "approach_desc": { en: "We combine active recall (flashcards), retrieval practice (self-testing), and immediate feedback to help you learn effectively. These methods are backed by decades of cognitive science research." },
      "about": { en: "About" },
      "version": { en: "Version" },
      "status": { en: "Status" },
      "all_systems_go": { en: "All systems go ✓" },
      "feedback": { en: "Feedback" },
      "send_feedback": { en: "Send feedback" },
      "ui_size_desc": { en: "Changes text size and spacing throughout the app" },
      "more_languages_soon": { en: "More languages coming soon" },
      "grade_system_desc": { en: "Choose how grades are displayed throughout the app" },
      
      // Age/Onboarding
      "age_question": { en: "How old are you?" },
      "age_helps": { en: "This helps us adjust content difficulty and tone" },
      "age_privacy": { en: "Your age is stored locally and never shared" },
      "get_started": { en: "Get started" },
      "skip": { en: "Skip" },
      "source": { en: "Source" },
      
      // Login/Auth
      "save_your_progress": { en: "Save your progress" },
      "login_benefit": { en: "Create an account to access your study sets on any device" },
      "email": { en: "Email" },
      "enter_email": { en: "Enter your email..." },
      "send_magic_link": { en: "Send magic link" },
      "magic_link_sent_title": { en: "Check Your Email!" },
      "magic_link_sent": { en: "We've sent a magic link to {email}. Click it to log in instantly." },
      "sending": { en: "Sending..." },
      "or": { en: "or" },
      "continue_with_google": { en: "Continue with Google" },
      "skip_for_now": { en: "Skip for now" },
      "login_privacy": { en: "We'll never share your email or study data with anyone" },
      "check_your_email": { en: "Check your email!" },
      "profile": { en: "Profile" },
      "account": { en: "Account" },
      "sign_out": { en: "Sign out" },
      "upgrade_premium": { en: "Upgrade to Premium" },
      "premium_member": { en: "Premium Member" },
      "per_month": { en: "per month" },
      "secure_payment": { en: "Secure payment" },
      "free": { en: "Free" },
      "profile_coming_soon": { en: "Profile coming soon! For now, you can save flashcards locally." },
      "enter_set_name": { en: "Name your flashcard set..." },
      "set_saved": { en: "Flashcard set saved successfully!" },
      "save_first": { en: "Please save this set first before sharing" },
      "share_failed": { en: "Failed to generate share link" },
      "link_copied": { en: "Link copied to clipboard!" },
      
      // Grade system
      "grade_system": { en: "Grade System" },
      "ui_size": { en: "UI Size" },
      "small": { en: "Small" },
      "default": { en: "Default" },
      "large": { en: "Large" },
      
      // Alert messages
      "enter_name_for_set": { en: "Please enter a name for this flashcard set" },
      "set_saved_successfully": { en: "Flashcard set saved successfully!" },
      "save_before_sharing": { en: "Please save this set first before sharing" },
      "share_link_failed": { en: "Failed to generate share link" },
      "link_copied_clipboard": { en: "Link copied to clipboard!" },
      
      // Error messages
      "no_text_pdf": { en: "No text found in PDF. It may be image-based or scanned. Try converting to images and using OCR." },
      "failed_extract_pdf": { en: "Failed to extract PDF" },
      "unknown_error": { en: "Unknown error" },
      "failed_extract_text": { en: "Failed to extract text from document" },
      "no_text_document": { en: "No text found in the document." },
      "no_text_image": { en: "No text found in the image. Please try a clearer image." },
      "unsupported_file": { en: "Unsupported file type. Please upload an image." },
      "failed_process_file": { en: "Failed to process file. Please try again." },
      "pdf_extract_failed_manual": { en: "Failed to extract text from PDF. Please try copying the text manually." },
      
      // Math-specific
      "use_pen_paper": { en: "Use pen and paper to solve this problem" },
      "show_your_work": { en: "Show your work" },
      "math_problem": { en: "Math Problem" },
      "solve_problem": { en: "Solve the problem:" },
      "confirm_delete": { en: "Are you sure you want to delete this flashcard set?" },
      "no_saved_sets_yet": { en: "No saved sets yet" },
      "create_flashcards_to_start": { en: "Create some flashcards to get started" },
      "cards": { en: "cards" },
      "last_studied": { en: "Last studied" },
      "created": { en: "Created" },
      "storage": { en: "Storage" },
      "local_browser": { en: "Local (Browser)" },
      "privacy": { en: "Privacy" },
      "all_data_local": { en: "All data stays on your device" },
      "local_storage_info": { en: "Your study sets and settings are stored locally in your browser. No data is sent to external servers except for AI flashcard generation." },
      "save_this_set": { en: "Save this set" },
      "name_your_set": { en: "Name your flashcard set..." },
      "cancel": { en: "Cancel" },
      "share_study_set": { en: "Share this study set" },
      "anyone_can_view": { en: "Anyone with this link can view and study your flashcards" },
      "tip_sign_in": { en: "Tip: Sign in later to access your shared sets across devices" },
      "keep_going_msg": { en: "Keep going, you've got this!" },
      "practice_msg": { en: "Don't worry, practice makes perfect!" },
      "correct_answer_prefix": { en: "The correct answer is:" },
      "on_fire_msg": { en: "You're on fire!" },
      "keep_it_up_msg": { en: "Keep it up!" },
      "enter_text_or_upload": { en: "Please enter some text or upload an image." },
      "failed_extract_youtube": { en: "Failed to extract YouTube transcript" },
      "youtube_needs_captions": { en: "Failed to extract YouTube transcript. Make sure the video has captions." },
      "transcript_extracted": { en: "Transcript extracted! Review it and click 'Generate flashcards' when ready." },
      "provide_more_content": { en: "Please provide more content to generate meaningful flashcards." },
      
      // Premium and Rate Limiting
      "upgrade_to_premium": { en: "Upgrade to Premium" },
      "free_limit_reached": { en: "You've reached your free study set limit. Upgrade to premium to create unlimited study sets and unlock more features!" },
      "daily_limit_reached": { en: "Daily Limit Reached" },
      "ascend_to_premium": { en: "Ascend to Premium" },
      "come_back_tomorrow": { en: "Come back tomorrow" },
      "study_smarter_not_longer": { en: "Study smarter, not longer" },
      "study_sets_created": { en: "Study sets created" },
      "limit_reached_upgrade": { en: "You've reached your daily free generation limit. Upgrade to Premium for unlimited AI generations, or come back tomorrow for another free generation." },
      "daily_generation_limit": { en: "Daily Generation Limit" },
      "free_users_daily_limit": { en: "Free users: 1 AI generation per day" },
      "premium_unlimited": { en: "Premium: Unlimited generations" },
      "current_plan": { en: "Current Plan" },
      "subscription": { en: "Subscription" },
      // "upgrade_premium": { en: "Upgrade to Premium" },
      // "account": { en: "Account" },
      // "sign_out": { en: "Sign out" },
      
      "premium_includes": { en: "Premium includes" },
      "unlimited_study_sets": { en: "Unlimited Study Sets" },
      "create_as_many": { en: "Create as many sets as you want" },
      "pdf_support": { en: "Early Access" },
      "upload_pdf_docs": { en: "Get all current and upcoming premium features" },
      "youtube_support": { en: "Priority AI" },
      "learn_from_videos": { en: "Faster generation and higher quality cards" },
      "image_ocr": { en: "Image OCR" },
      "scan_photos": { en: "Scan photos of notes and textbooks" },
      "why_premium": { en: "Why Premium?" },
      "ai_costs_money": { en: "Premium helps us build the future of StudyMaxx while keeping the basic tier available for everyone." },
      "ai_costs_explanation": { en: "Your support allows us to use more advanced AI models and develop new features faster. Premium members get priority access to all new features." },
      "coming_soon": { en: "Coming Soon" },
      "payment_coming_soon": { en: "Payment integration coming soon!" },
      "premium_feature": { en: "Premium Feature" },
      "premium_required": { en: "This feature requires premium" },
      
      // New translations for UX fixes
      "move_to_folder": { en: "Move to folder" },
      "move": { en: "Move" },
      "account_created": { en: "Account Created!" },
      "check_email_to_verify": { en: "Check your email to activate your account:" },
      "open_verification_email": { en: "Open the verification email we just sent you" },
      "click_verify_link": { en: "Click the verification link" },
      "auto_login_after_verify": { en: "You'll be automatically logged in!" },
      "tip": { en: "Tip" },
      "check_spam_folder": { en: "Check your spam folder if you don't see the email" },
      "you_have_premium": { en: "You Have Premium!" },
      "premium_active_message": { en: "You're already enjoying all premium features. Keep crushing those study goals!" },
      
      // Folders
      "folders": { en: "Folders" },
      "new_folder": { en: "New Folder" },
      "folder_name": { en: "Folder Name" },
      "folder_name_placeholder": { en: "e.g., Math, Biology, History..." },
      "create": { en: "Create" },
      "creating": { en: "Creating..." },
      "all_sets": { en: "All Sets" },
      "no_folders_yet": { en: "No folders yet" },
      "create_first_folder": { en: "Create your first folder to organize flashcards!" },
      "delete_folder": { en: "Delete folder" },
      "move_to_folder_header": { en: "Move to folder" },
      
      // Contact
      "contact_us": { en: "Contact Us" },
      "contact_description": { en: "Have questions, feedback, or issues? Get in touch!" },
      "contact_email": { en: "Email" },
      "send_email": { en: "Send us an email" },
      
      // Auth/Onboarding guidance
      "no_account_create_one": { en: "Don't have an account? Create one first." },
      "verify_email_required": { en: "We sent you an email. You must verify your account before you can log in." },
      "check_your_inbox": { en: "Check your inbox and click the verification link." },
      "already_have_account": { en: "Already have an account?" },
      "switch_to_login": { en: "Switch to login" }
    };
    
    let text = translations[key]?.[settings.language] || key;
    
    // Replace variables if provided
    if (variables) {
      Object.keys(variables).forEach(varKey => {
        text = text.replace(`{${varKey}}`, variables[varKey]);
      });
    }
    
    return text;
  };
}

/**
 * Convert grade between systems
 */
export function useGradeConverter() {
  const { settings } = useSettings();
  
  return (value: string, from: GradeSystem = "A-F"): string => {
    const to = settings.gradeSystem;
    
    // A-F to 1-6 mapping (Norwegian system)
    const afTo16: Record<string, string> = {
      "A": "6", "B": "5", "C": "4", "D": "3", "E": "2", "F": "1"
    };
    
    const _16ToAf: Record<string, string> = {
      "6": "A", "5": "B", "4": "C", "3": "D", "2": "E", "1": "F"
    };
    
    const afToPercent: Record<string, string> = {
      "A": "90-100%", "B": "80-89%", "C": "70-79%", "D": "60-69%", "E": "50-59%", "F": "0-49%"
    };
    
    if (from === to) return value;
    
    if (from === "A-F" && to === "1-6") return afTo16[value] || value;
    if (from === "1-6" && to === "A-F") return _16ToAf[value] || value;
    if (from === "A-F" && to === "percentage") return afToPercent[value] || value;
    
    return value;
  };
}
