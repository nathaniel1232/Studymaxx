"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "no";
export type UIScale = "small" | "default" | "large";
export type GradeSystem = "A-F" | "1-6" | "percentage";

export interface AppSettings {
  theme: Theme;
  language: Language;
  uiScale: UIScale;
  gradeSystem: GradeSystem;
}

interface SettingsContextType {
  settings: AppSettings;
  updateTheme: (theme: Theme) => void;
  updateLanguage: (language: Language) => void;
  updateUIScale: (scale: UIScale) => void;
  updateGradeSystem: (system: GradeSystem) => void;
}

const defaultSettings: AppSettings = {
  theme: "dark",
  language: "en",
  uiScale: "default",
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
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

/**
 * Apply UI scale to document
 */
function applyUIScale(scale: UIScale): void {
  if (typeof window === "undefined") return;
  
  const root = document.documentElement;
  
  // Remove existing scale classes
  root.classList.remove("ui-small", "ui-large");
  
  // Add new scale class
  if (scale === "small") {
    root.classList.add("ui-small");
  } else if (scale === "large") {
    root.classList.add("ui-large");
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
    applyUIScale(loaded.uiScale);
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

  const updateUIScale = (uiScale: UIScale) => {
    const newSettings = { ...settings, uiScale };
    setSettings(newSettings);
    saveSettings(newSettings);
    applyUIScale(uiScale);
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
        updateUIScale,
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
      "home": { en: "Home", no: "Hjem" },
      "create_new": { en: "Create new", no: "Lag ny" },
      "my_sets": { en: "My Sets", no: "Mine sett" },
      "settings": { en: "Settings", no: "Innstillinger" },
      "back": { en: "Back", no: "Tilbake" },
      "continue": { en: "Continue", no: "Fortsett" },
      "loading": { en: "Loading...", no: "Laster..." },
      
      // Study modes
      "study": { en: "Study", no: "Studer" },
      "test_yourself": { en: "Test Yourself", no: "Test deg selv" },
      "quiz": { en: "Quiz", no: "Quiz" },
      "flashcards": { en: "Flashcards", no: "Kunnskapskort" },
      
      // Flashcard grading
      "bad": { en: "Bad", no: "Dårlig" },
      "ok": { en: "OK", no: "OK" },
      "good": { en: "Good", no: "Bra" },
      "weak": { en: "Weak", no: "Svak" },
      "medium": { en: "Medium", no: "Medium" },
      "mastered": { en: "Mastered", no: "Mestret" },
      "review_summary": { en: "Review Summary", no: "Oppsummering" },
      "weak_cards": { en: "Weak cards", no: "Svake kort" },
      "medium_cards": { en: "Medium cards", no: "Medium kort" },
      "mastered_cards": { en: "Mastered cards", no: "Mestrede kort" },
      "continue_to_test": { en: "Continue to test", no: "Fortsett til test" },
      "review_weak_first": { en: "Review weak cards first", no: "Gjennomgå svake kort først" },
      
      // Test flow
      "shuffle": { en: "Shuffle", no: "Bland" },
      "shuffle_disabled_test": { en: "Shuffle disabled during test", no: "Blanding deaktivert under test" },
      "retake_test": { en: "Retake test", no: "Ta testen på nytt" },
      "resume": { en: "Resume", no: "Fortsett" },
      "review_mistakes": { en: "Review mistakes", no: "Gjennomgå feil" },
      "study_mistakes": { en: "Study mistakes", no: "Studer feil" },
      "try_again": { en: "Try again", no: "Prøv igjen" },
      "retake_quiz": { en: "Retake quiz", no: "Ta quizen på nytt" },
      "perfect": { en: "Perfect!", no: "Perfekt!" },
      "perfect_score": { en: "Perfect score!", no: "Perfekt score!" },
      "quiz_complete": { en: "Quiz complete!", no: "Quiz fullført!" },
      "quiz_ended": { en: "Quiz ended", no: "Quiz avsluttet" },
      "nice_work": { en: "Nice work!", no: "Bra jobbet!" },
      "lets_review": { en: "Let's review", no: "La oss gjennomgå" },
      "questions_answered": { en: "questions answered", no: "spørsmål besvart" },
      "correct": { en: "correct", no: "riktige" },
      "best_streak": { en: "Best streak", no: "Beste rekke" },
      "max_streak": { en: "Max streak", no: "Maks rekke" },
      "study_mode": { en: "Study mode", no: "Studiemodus" },
      "all_done": { en: "All done!", no: "Ferdig!" },
      "youve_reviewed_all": { en: "You've reviewed all the cards", no: "Du har gjennomgått alle kortene" },
      "study_again": { en: "Study again", no: "Studer igjen" },
      "previous": { en: "Previous", no: "Forrige" },
      "next": { en: "Next", no: "Neste" },
      "got_it": { en: "Got it", no: "Skjønner" },
      "question": { en: "Question", no: "Spørsmål" },
      "answered": { en: "answered", no: "besvart" },
      "select_correct_answer": { en: "Select the correct answer:", no: "Velg riktig svar:" },
      "click_to_reveal": { en: "Click to reveal answer", no: "Klikk for å se svaret" },
      "click_to_see_question": { en: "Click to see question", no: "Klikk for å se spørsmålet" },
      "answer": { en: "Answer", no: "Svar" },
      "lives": { en: "Lives", no: "Liv" },
      "streak": { en: "Streak", no: "Rekke" },
      "progress": { en: "Progress", no: "Fremdrift" },
      
      // Create flow
      "subject": { en: "Subject", no: "Fag" },
      "grade": { en: "Grade", no: "Karakter" },
      "what_studying_from": { en: "What are you studying from?", no: "Hva studerer du fra?" },
      "add_material_for": { en: "Add your learning material for", no: "Legg til læringsmateriale for" },
      "notes": { en: "Notes", no: "Notater" },
      "paste_notes": { en: "Paste or type your study notes", no: "Lim inn eller skriv notater" },
      "pdf_document": { en: "PDF or Document", no: "PDF eller Dokument" },
      "upload_file": { en: "Upload a file (PDF, DOCX)", no: "Last opp fil (PDF, DOCX)" },
      "youtube_video": { en: "YouTube Video", no: "YouTube-video" },
      "learn_from_video": { en: "Learn from video transcript", no: "Lær fra videotranskripsjon" },
      "image": { en: "Image", no: "Bilde" },
      "upload_image_ocr": { en: "Upload image with text (OCR)", no: "Last opp bilde med tekst (OCR)" },
      "recommended": { en: "Recommended", no: "Anbefalt" },
      "change": { en: "Change", no: "Endre" },
      "paste_notes_here": { en: "Paste your notes here...", no: "Lim inn notatene dine her..." },
      "click_to_upload": { en: "Click to upload", no: "Klikk for å laste opp" },
      "pdf_or_docx": { en: "PDF or DOCX", no: "PDF eller DOCX" },
      "click_to_upload_image": { en: "Click to upload image", no: "Klikk for å laste opp bilde" },
      "jpg_png_formats": { en: "JPG, PNG, or other image formats", no: "JPG, PNG, eller andre bildeformater" },
      "click_to_change": { en: "Click to change file", no: "Klikk for å endre fil" },
      "characters_extracted": { en: "characters extracted", no: "tegn ekstrahert" },
      "processing": { en: "Processing...", no: "Behandler..." },
      "what_grade_aiming": { en: "What grade are you aiming for?", no: "Hvilken karakter sikter du mot?" },
      "create_right_amount": { en: "We'll create the right amount of study material for your goal", no: "Vi lager riktig mengde studiemateriale for målet ditt" },
      "generate_study_set": { en: "Generate Study Set", no: "Generer Studiesett" },
      "creating_study_set": { en: "Creating your study set...", no: "Lager studiesesettet ditt..." },
      "usually_takes": { en: "This usually takes 10-20 seconds", no: "Dette tar vanligvis 10-20 sekunder" },
      "analyzing_material": { en: "Analyzing your {subject} material", no: "Analyserer {subject}-materialet ditt" },
      "creating_flashcards_grade": { en: "Creating flashcards for grade {grade}", no: "Lager kunnskapskort for karakter {grade}" },
      "generating_quiz": { en: "Generating quiz questions", no: "Genererer quizspørsmål" },
      "while_you_wait": { en: "While you wait...", no: "Mens du venter..." },
      "excellence": { en: "Excellence", no: "Perfeksjon" },
      "master_every_detail": { en: "Master every detail", no: "Mestrer alle detaljer" },
      "very_good": { en: "Very Good", no: "Veldig Bra" },
      "strong_understanding": { en: "Strong understanding", no: "Sterk forståelse" },
      "solid_foundations": { en: "Solid foundations", no: "Solide grunnlag" },
      "satisfactory": { en: "Satisfactory", no: "Tilfredsstillende" },
      "core_concepts": { en: "Core concepts", no: "Kjernekonsepter" },
      "passing": { en: "Passing", no: "Bestått" },
      "essential_knowledge": { en: "Essential knowledge", no: "Viktigste kunnskapen" },
      "absolute_mastery": { en: "Absolute mastery", no: "Fullstendig mestring" },
      "please_enter_subject": { en: "Please enter a subject", no: "Vennligst skriv inn et fag" },
      "please_choose_material": { en: "Please choose a material type", no: "Vennligst velg en materialtype" },
      "please_add_notes": { en: "Please add your notes", no: "Vennligst legg til notatene dine" },
      "please_add_youtube": { en: "Please add a YouTube URL", no: "Vennligst legg til en YouTube-URL" },
      "please_upload_file": { en: "Please upload a file", no: "Vennligst last opp en fil" },
      "please_choose_grade": { en: "Please choose your target grade", no: "Vennligst velg målkarakteren din" },
      "enter_your_age": { en: "Enter your age...", no: "Skriv inn alderen din..." },
      "create_study_set": { en: "Create Study Set", no: "Lag studiesett" },
      "what_subject": { en: "What subject are you studying?", no: "Hvilket fag studerer du?" },
      "helps_create": { en: "This helps us create relevant study materials", no: "Dette hjelper oss å lage relevante studiemateriell" },
      "type_subject": { en: "Type a subject...", no: "Skriv inn et fag..." },
      "choose_common": { en: "Or choose a common subject:", no: "Eller velg et vanlig fag:" },
      "choose_material": { en: "Choose your learning material", no: "Velg ditt læringsmateriale" },
      "target_grade": { en: "What's your target grade?", no: "Hva er målkarakteren din?" },
      "determines_depth": { en: "This determines the depth and quantity of flashcards", no: "Dette bestemmer dybden og mengden kunnskapskort" },
      
      // Home page
      "learn_smarter": { en: "LEARN SMARTER, NOT LONGER", no: "LÆR SMARTERE, IKKE LENGRE" },
      "turn_notes": { en: "Turn your notes into something you can actually learn from", no: "Gjør notatene dine om til noe du faktisk kan lære av" },
      "notes_to_tests": { en: "Notes → Flashcards → Tests. Study with confidence.", no: "Notater → Kunnskapskort → Tester. Studer med selvtillit." },
      "create_flashcards": { en: "Create flashcards", no: "Lag kunnskapskort" },
      "upload_notes": { en: "Upload notes, PDFs, or YouTube videos. Get smart flashcards instantly.", no: "Last opp notater, PDF-er eller YouTube-videoer. Få smarte kunnskapskort umiddelbart." },
      "test_yourself_desc": { en: "Quiz mode with smart multiple-choice questions that actually challenge you.", no: "Quizmodus med smarte flervalgsoppgaver som faktisk utfordrer deg." },
      "track_progress": { en: "Track progress", no: "Følg framgang" },
      "build_streaks": { en: "Build streaks, earn lives, and watch yourself get better every day.", no: "Bygg streaker, tjen liv, og se deg selv bli bedre hver dag." },
      "did_you_know": { en: "Did you know?", no: "Visste du det?" },
      "your_study_sets": { en: "Your study sets", no: "Dine studiesett" },
      "view_all": { en: "View all", no: "Se alle" },
      "no_saved_sets": { en: "No saved sets yet", no: "Ingen lagrede sett ennå" },
      "create_to_start": { en: "Create some flashcards to get started", no: "Lag noen kunnskapskort for å komme i gang" },
      
      // Buttons
      "delete": { en: "Delete", no: "Slett" },
      "save": { en: "Save", no: "Lagre" },
      "share": { en: "Share", no: "Del" },
      "copy_link": { en: "Copy Link", no: "Kopier lenke" },
      "close": { en: "Close", no: "Lukk" },
      
      // Settings
      "appearance": { en: "Appearance", no: "Utseende" },
      "theme": { en: "Theme", no: "Tema" },
      "light": { en: "Light", no: "Lys" },
      "dark": { en: "Dark", no: "Mørk" },
      "system": { en: "System", no: "System" },
      "language": { en: "Language", no: "Språk" },
      "english": { en: "English", no: "Engelsk" },
      "norwegian": { en: "Norwegian", no: "Norsk" },
      "personalize": { en: "Personalize your study experience", no: "Tilpass din studieopplevelse" },
      "settings_saved": { en: "Settings saved", no: "Innstillinger lagret" },
      
      // SettingsView specific
      "how_studymaxx_works": { en: "How StudyMaxx Works", no: "Hvordan StudyMaxx fungerer" },
      "built_on_science": { en: "StudyMaxx is built on proven learning science. Here's why it works:", no: "StudyMaxx er bygget på bevist læringsvitenskap. Her er hvorfor det fungerer:" },
      "our_approach": { en: "Our approach", no: "Vår tilnærming" },
      "approach_desc": { en: "We combine active recall (flashcards), retrieval practice (self-testing), and immediate feedback to help you learn effectively. These methods are backed by decades of cognitive science research.", no: "Vi kombinerer aktiv gjenkalling (kunnskapskort), gjenkallingsøvelse (selvtesting) og umiddelbar tilbakemelding for å hjelpe deg med å lære effektivt. Disse metodene er støttet av tiår med kognitiv forskning." },
      "about": { en: "About", no: "Om" },
      "version": { en: "Version", no: "Versjon" },
      "status": { en: "Status", no: "Status" },
      "all_systems_go": { en: "All systems go ✓", no: "Alle systemer ok ✓" },
      "feedback": { en: "Feedback", no: "Tilbakemelding" },
      "send_feedback": { en: "Send feedback", no: "Send tilbakemelding" },
      "ui_size_desc": { en: "Changes text size and spacing throughout the app", no: "Endrer tekststørrelse og avstand gjennom hele appen" },
      "more_languages_soon": { en: "More languages coming soon", no: "Flere språk kommer snart" },
      "grade_system_desc": { en: "Choose how grades are displayed throughout the app", no: "Velg hvordan karakterer vises gjennom hele appen" },
      
      // Age/Onboarding
      "age_question": { en: "How old are you?", no: "Hvor gammel er du?" },
      "age_helps": { en: "This helps us adjust content difficulty and tone", no: "Dette hjelper oss å justere innholdsvanskelighet og tone" },
      "age_privacy": { en: "Your age is stored locally and never shared", no: "Din alder lagres lokalt og deles aldri" },
      "get_started": { en: "Get started", no: "Kom i gang" },
      "skip": { en: "Skip", no: "Hopp over" },
      "source": { en: "Source", no: "Kilde" },
      
      // Login/Auth
      "save_your_progress": { en: "Save your progress", no: "Lagre fremgangen din" },
      "login_benefit": { en: "Create an account to access your study sets on any device", no: "Opprett en konto for å få tilgang til studiesettene dine på enhver enhet" },
      "email": { en: "Email", no: "E-post" },
      "enter_email": { en: "Enter your email...", no: "Skriv inn e-posten din..." },
      "send_magic_link": { en: "Send magic link", no: "Send magisk lenke" },
      "magic_link_sent_title": { en: "Check Your Email!", no: "Sjekk e-posten din!" },
      "magic_link_sent": { en: "We've sent a magic link to {email}. Click it to log in instantly.", no: "Vi har sendt en magisk lenke til {email}. Klikk på den for å logge inn umiddelbart." },
      "sending": { en: "Sending...", no: "Sender..." },
      "or": { en: "or", no: "eller" },
      "continue_with_google": { en: "Continue with Google", no: "Fortsett med Google" },
      "skip_for_now": { en: "Skip for now", no: "Hopp over nå" },
      "login_privacy": { en: "We'll never share your email or study data with anyone", no: "Vi deler aldri e-posten eller studiedataene dine med noen" },
      "check_your_email": { en: "Check your email!", no: "Sjekk e-posten din!" },
      "profile": { en: "Profile", no: "Profil" },
      "account": { en: "Account", no: "Konto" },
      "sign_out": { en: "Sign out", no: "Logg ut" },
      "upgrade_premium": { en: "Upgrade to Premium", no: "Oppgrader til Premium" },
      "premium_member": { en: "Premium Member", no: "Premium medlem" },
      "per_month": { en: "per month", no: "per måned" },
      "secure_payment": { en: "Secure payment", no: "Sikker betaling" },
      "free": { en: "Free", no: "Gratis" },
      "profile_coming_soon": { en: "Profile coming soon! For now, you can save flashcards locally.", no: "Profil kommer snart! Foreløpig kan du lagre kunnskapskort lokalt." },
      "enter_set_name": { en: "Name your flashcard set...", no: "Navngi kunnskapskortsett..." },
      "set_saved": { en: "Flashcard set saved successfully!", no: "Kunnskapskortsettet ble lagret!" },
      "save_first": { en: "Please save this set first before sharing", no: "Vennligst lagre dette settet før du deler" },
      "share_failed": { en: "Failed to generate share link", no: "Kunne ikke generere delingslenke" },
      "link_copied": { en: "Link copied to clipboard!", no: "Lenke kopiert!" },
      
      // Grade system
      "grade_system": { en: "Grade System", no: "Karaktersystem" },
      "ui_size": { en: "UI Size", no: "UI-størrelse" },
      "small": { en: "Small", no: "Liten" },
      "default": { en: "Default", no: "Standard" },
      "large": { en: "Large", no: "Stor" },
      
      // Alert messages
      "enter_name_for_set": { en: "Please enter a name for this flashcard set", no: "Vennligst skriv inn et navn for dette kunnskapskortet" },
      "set_saved_successfully": { en: "Flashcard set saved successfully!", no: "Kunnskapskortsett lagret!" },
      "save_before_sharing": { en: "Please save this set first before sharing", no: "Vennligst lagre dette settet før du deler" },
      "share_link_failed": { en: "Failed to generate share link", no: "Kunne ikke generere delingslenke" },
      "link_copied_clipboard": { en: "Link copied to clipboard!", no: "Lenke kopiert til utklippstavlen!" },
      
      // Error messages
      "no_text_pdf": { en: "No text found in PDF. It may be image-based or scanned. Try converting to images and using OCR.", no: "Ingen tekst funnet i PDF. Den kan være bildebasert eller skannet. Prøv å konvertere til bilder og bruk OCR." },
      "failed_extract_pdf": { en: "Failed to extract PDF", no: "Kunne ikke ekstrahere PDF" },
      "unknown_error": { en: "Unknown error", no: "Ukjent feil" },
      "failed_extract_text": { en: "Failed to extract text from document", no: "Kunne ikke ekstrahere tekst fra dokument" },
      "no_text_document": { en: "No text found in the document.", no: "Ingen tekst funnet i dokumentet." },
      "no_text_image": { en: "No text found in the image. Please try a clearer image.", no: "Ingen tekst funnet i bildet. Prøv et klarere bilde." },
      "unsupported_file": { en: "Unsupported file type. Please upload an image.", no: "Ikke-støttet filtype. Vennligst last opp et bilde." },
      "failed_process_file": { en: "Failed to process file. Please try again.", no: "Kunne ikke behandle fil. Vennligst prøv igjen." },
      "pdf_extract_failed_manual": { en: "Failed to extract text from PDF. Please try copying the text manually.", no: "Kunne ikke ekstrahere tekst fra PDF. Prøv å kopiere teksten manuelt." },
      
      // Math-specific
      "use_pen_paper": { en: "Use pen and paper to solve this problem", no: "Bruk penn og papir for å løse denne oppgaven" },
      "show_your_work": { en: "Show your work", no: "Vis utregningen din" },
      "math_problem": { en: "Math Problem", no: "Matteoppgave" },
      "solve_problem": { en: "Solve the problem:", no: "Løs oppgaven:" },
      "confirm_delete": { en: "Are you sure you want to delete this flashcard set?", no: "Er du sikker på at du vil slette dette kunnskapskortet?" },
      "no_saved_sets_yet": { en: "No saved sets yet", no: "Ingen lagrede sett ennå" },
      "create_flashcards_to_start": { en: "Create some flashcards to get started", no: "Lag noen kunnskapskort for å komme i gang" },
      "cards": { en: "cards", no: "kort" },
      "last_studied": { en: "Last studied", no: "Sist studert" },
      "created": { en: "Created", no: "Opprettet" },
      "storage": { en: "Storage", no: "Lagring" },
      "local_browser": { en: "Local (Browser)", no: "Lokalt (Nettleser)" },
      "privacy": { en: "Privacy", no: "Personvern" },
      "all_data_local": { en: "All data stays on your device", no: "All data blir på enheten din" },
      "local_storage_info": { en: "Your study sets and settings are stored locally in your browser. No data is sent to external servers except for AI flashcard generation.", no: "Studiesettene og innstillingene dine lagres lokalt i nettleseren din. Ingen data sendes til eksterne servere bortsett fra AI-generering av kunnskapskort." },
      "save_this_set": { en: "Save this set", no: "Lagre dette settet" },
      "name_your_set": { en: "Name your flashcard set...", no: "Navngi kunnskapskortet ditt..." },
      "cancel": { en: "Cancel", no: "Avbryt" },
      "share_study_set": { en: "Share this study set", no: "Del dette studiesettet" },
      "anyone_can_view": { en: "Anyone with this link can view and study your flashcards", no: "Alle med denne lenken kan se og studere kunnskapskortene dine" },
      "tip_sign_in": { en: "Tip: Sign in later to access your shared sets across devices", no: "Tips: Logg inn senere for å få tilgang til delte sett på tvers av enheter" },
      "keep_going_msg": { en: "Keep going, you've got this!", no: "Hold ut, du klarer det!" },
      "practice_msg": { en: "Don't worry, practice makes perfect!", no: "Ikke bekymre deg, øvelse gjør mester!" },
      "correct_answer_prefix": { en: "The correct answer is:", no: "Det riktige svaret er:" },
      "on_fire_msg": { en: "You're on fire!", no: "Du er på fyr!" },
      "keep_it_up_msg": { en: "Keep it up!", no: "Hold det gående!" },
      "enter_text_or_upload": { en: "Please enter some text or upload an image.", no: "Vennligst skriv inn tekst eller last opp et bilde." },
      "failed_extract_youtube": { en: "Failed to extract YouTube transcript", no: "Kunne ikke ekstrahere YouTube-transkripsjon" },
      "youtube_needs_captions": { en: "Failed to extract YouTube transcript. Make sure the video has captions.", no: "Kunne ikke ekstrahere YouTube-transkripsjon. Sjekk at videoen har undertekster." },
      "transcript_extracted": { en: "Transcript extracted! Review it and click 'Generate flashcards' when ready.", no: "Transkripsjon ekstrahert! Se over den og klikk 'Generer kunnskapskort' når du er klar." },
      "provide_more_content": { en: "Please provide more content to generate meaningful flashcards.", no: "Vennligst gi mer innhold for å generere meningsfulle kunnskapskort." },
      
      // Premium and Rate Limiting
      "upgrade_to_premium": { en: "Upgrade to Premium", no: "Oppgrader til Premium" },
      "free_limit_reached": { en: "You've reached your free study set limit. Upgrade to premium to create unlimited study sets and unlock more features!", no: "Du har nådd grensen for gratis studiesett. Oppgrader til premium for å lage ubegrensede studiesett og låse opp flere funksjoner!" },
      "daily_limit_reached": { en: "Daily Limit Reached", no: "Daglig grense nådd" },
      "ascend_to_premium": { en: "Ascend to Premium", no: "Oppgrader til Premium" },
      "come_back_tomorrow": { en: "Come back tomorrow", no: "Kom tilbake i morgen" },
      "study_smarter_not_longer": { en: "Study smarter, not longer", no: "Studer smartere, ikke lenger" },
      "study_sets_created": { en: "Study sets created", no: "Studiesett opprettet" },
      "limit_reached_upgrade": { en: "You've reached your daily free generation limit. Upgrade to Premium for unlimited AI generations, or come back tomorrow for another free generation.", no: "Du har nådd din daglige gratisgrense. Oppgrader til Premium for ubegrensede AI-genereringer, eller kom tilbake i morgen for en ny gratis generering." },
      "daily_generation_limit": { en: "Daily Generation Limit", no: "Daglig genereringsgrense" },
      "free_users_daily_limit": { en: "Free users: 1 AI generation per day", no: "Gratisbrukere: 1 AI-generering per dag" },
      "premium_unlimited": { en: "Premium: Unlimited generations", no: "Premium: Ubegrensede genereringer" },
      "current_plan": { en: "Current Plan", no: "Nåværende plan" },
      "subscription": { en: "Subscription", no: "Abonnement" },
      // "upgrade_premium": { en: "Upgrade to Premium", no: "Oppgrader til Premium" },
      // "account": { en: "Account", no: "Konto" },
      // "sign_out": { en: "Sign out", no: "Logg ut" },
      
      "premium_includes": { en: "Premium includes", no: "Premium inkluderer" },
      "unlimited_study_sets": { en: "Unlimited Study Sets", no: "Ubegrensede Studiesett" },
      "create_as_many": { en: "Create as many sets as you want", no: "Lag så mange sett du vil" },
      "pdf_support": { en: "PDF Support", no: "PDF-støtte" },
      "upload_pdf_docs": { en: "Upload and learn from PDF documents", no: "Last opp og lær fra PDF-dokumenter" },
      "youtube_support": { en: "YouTube Support", no: "YouTube-støtte" },
      "learn_from_videos": { en: "Learn from video transcripts", no: "Lær fra videotranskripsjon" },
      "image_ocr": { en: "Image OCR", no: "Bilde-OCR" },
      "scan_photos": { en: "Scan photos of notes and textbooks", no: "Skann bilder av notater og lærebøker" },
      "why_premium": { en: "Why Premium?", no: "Hvorfor Premium?" },
      "ai_costs_money": { en: "Generating flashcards with AI costs money. Premium helps us cover these costs while keeping the free tier available for everyone.", no: "Generering av kunnskapskort med AI koster penger. Premium hjelper oss å dekke disse kostnadene mens vi holder gratisversjonen tilgjengelig for alle." },
      "ai_costs_explanation": { en: "AI flashcard generation uses advanced language models that have real computational costs. Your premium subscription helps us provide this service sustainably while keeping StudyMaxx free for students who need it most.", no: "AI-generering av kunnskapskort bruker avanserte språkmodeller som har reelle beregningskostnader. Ditt premium-abonnement hjelper oss å tilby denne tjenesten bærekraftig mens vi holder StudyMaxx gratis for studenter som trenger det mest." },
      "coming_soon": { en: "Coming Soon", no: "Kommer snart" },
      "payment_coming_soon": { en: "Payment integration coming soon!", no: "Betalingsintegrasjon kommer snart!" },
      "premium_feature": { en: "Premium Feature", no: "Premium-funksjon" },
      "premium_required": { en: "This feature requires premium", no: "Denne funksjonen krever premium" },
      
      // New translations for UX fixes
      "move_to_folder": { en: "Move to folder", no: "Flytt til mappe" },
      "move": { en: "Move", no: "Flytt" },
      "account_created": { en: "Account Created!", no: "Konto opprettet!" },
      "check_email_to_verify": { en: "Check your email to activate your account:", no: "Sjekk e-posten din for å aktivere kontoen din:" },
      "open_verification_email": { en: "Open the verification email we just sent you", no: "Åpne bekreftelsesmeldingen vi nettopp sendte deg" },
      "click_verify_link": { en: "Click the verification link", no: "Klikk på bekreftelseslenken" },
      "auto_login_after_verify": { en: "You'll be automatically logged in!", no: "Du vil automatisk bli logget inn!" },
      "tip": { en: "Tip", no: "Tips" },
      "check_spam_folder": { en: "Check your spam folder if you don't see the email", no: "Sjekk spam-mappen din hvis du ikke ser e-posten" },
      "you_have_premium": { en: "You Have Premium!", no: "Du har Premium!" },
      "premium_active_message": { en: "You're already enjoying all premium features. Keep crushing those study goals!", no: "Du nyter allerede alle premium-funksjonene. Fortsett å knuse disse studiemålene!" },
      
      // Folders
      "folders": { en: "Folders", no: "Mapper" },
      "new_folder": { en: "New Folder", no: "Ny mappe" },
      "folder_name": { en: "Folder Name", no: "Mappenavn" },
      "folder_name_placeholder": { en: "e.g., Math, Biology, History...", no: "f.eks., Matte, Biologi, Historie..." },
      "create": { en: "Create", no: "Opprett" },
      "creating": { en: "Creating...", no: "Oppretter..." },
      "all_sets": { en: "All Sets", no: "Alle sett" },
      "no_folders_yet": { en: "No folders yet", no: "Ingen mapper ennå" },
      "create_first_folder": { en: "Create your first folder to organize flashcards!", no: "Opprett din første mappe for å organisere kunnskapskort!" },
      "delete_folder": { en: "Delete folder", no: "Slett mappe" },
      "move_to_folder_header": { en: "Move to folder", no: "Flytt til mappe" },
      
      // Contact
      "contact_us": { en: "Contact Us", no: "Kontakt oss" },
      "contact_description": { en: "Have questions, feedback, or issues? Get in touch!", no: "Har du spørsmål, tilbakemeldinger eller problemer? Ta kontakt!" },
      "contact_email": { en: "Email", no: "E-post" },
      "send_email": { en: "Send us an email", no: "Send oss en e-post" },
      
      // Auth/Onboarding guidance
      "no_account_create_one": { en: "Don't have an account? Create one first.", no: "Har du ikke konto? Lag en først." },
      "verify_email_required": { en: "We sent you an email. You must verify your account before you can log in.", no: "Vi har sendt deg en e-post. Du må verifisere kontoen før du kan logge inn." },
      "check_your_inbox": { en: "Check your inbox and click the verification link.", no: "Sjekk innboksen og klikk på verifikasjonslenken." },
      "already_have_account": { en: "Already have an account?", no: "Har du allerede en konto?" },
      "switch_to_login": { en: "Switch to login", no: "Bytt til pålogging" }
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
