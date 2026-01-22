"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { generateFlashcards } from "../utils/flashcardGenerator";
import { Flashcard, getOrCreateUserId, getSavedFlashcardSets } from "../utils/storage";
import { getStudyFact } from "../utils/studyFacts";
import { checkAIRateLimit, incrementAIUsage, getRemainingGenerations } from "../utils/aiRateLimit";
import { useTranslation, useSettings } from "../contexts/SettingsContext";
import { getCurrentUser, supabase } from "../utils/supabase";
import ArrowIcon from "./icons/ArrowIcon";
import PremiumModal from "./PremiumModal";
import { messages } from "../utils/messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CreateFlowViewProps {
  onGenerateFlashcards: (cards: Flashcard[], subject: string, grade: string) => void;
  onBack: () => void;
  onRequestLogin?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type MaterialType = "notes" | "image" | "docx" | null;
type Grade = "A" | "B" | "C" | "D" | "E";

export default function CreateFlowView({ onGenerateFlashcards, onBack, onRequestLogin }: CreateFlowViewProps) {
  const t = useTranslation();
  const { settings } = useSettings();
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: Subject
  const [subject, setSubject] = useState("");
  
  // Step 2: Material
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(null);
  const [textInput, setTextInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  
  // Output language preference
  const [outputLanguage, setOutputLanguage] = useState<"auto" | "en">("auto");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([]);

  // Difficulty
  const [difficulty, setDifficulty] = useState<string>("Medium");
  
  // Math problems toggle
  const [includeMathProblems, setIncludeMathProblems] = useState(false);
  
  // Language learning settings (for Languages subject only)
  const [knownLanguage, setKnownLanguage] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("");
  
  // Check if subject is math-related
  const isMathSubject = subject.toLowerCase().includes("math") || 
                        subject.toLowerCase().includes("matte") ||
                        subject.toLowerCase().includes("matematikk") ||
                        subject.toLowerCase().includes("algebra") ||
                        subject.toLowerCase().includes("calculus");
  
  // Check if subject is language-related
  const isLanguageSubject = subject.toLowerCase().includes("language") ||
                            subject.toLowerCase().includes("språk");
  
  // Step 3: Grade
  const [targetGrade, setTargetGrade] = useState<Grade | null>(null);
  
  // Step 4: Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [error, setError] = useState("");
  
  // Premium state
  const [isPremium, setIsPremium] = useState(false);
  const [setsCreated, setSetsCreated] = useState(0);
  const [canCreateMore, setCanCreateMore] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDailyLimit, setIsDailyLimit] = useState(false);
  const [premiumCheckLoading, setPremiumCheckLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

  // Check premium status on mount AND when session changes
  useEffect(() => {
    console.log('[CreateFlowView] 🚀 MOUNT useEffect running');
    // Add a small delay to ensure session is fully initialized
    const timer = setTimeout(() => {
      console.log('[CreateFlowView] ⏰ Timer fired - calling checkPremiumStatus');
      checkPremiumStatus();
    }, 50);
    
    // Listen for auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[CreateFlowView] 🔄 Auth state changed:', event, 'Has session:', !!session);
        setHasSession(!!session);
        if (session) {
          // Add delay before checking premium to allow session to fully sync
          console.log('[CreateFlowView] ⏰ Session detected - scheduling premium check in 100ms');
          setTimeout(() => {
            console.log('[CreateFlowView] ⏰ Session timer fired - calling checkPremiumStatus');
            checkPremiumStatus();
          }, 100);
        } else {
          console.log('[CreateFlowView] ❌ No session - setting isPremium to FALSE');
          setIsPremium(false);
          setPremiumCheckLoading(false);
        }
      });
      
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Timer effect for generation progress
  useEffect(() => {
    if (!isGenerating || generationStartTime === 0) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isGenerating, generationStartTime]);

  // Message rotation effect - rotate every 20 seconds (slow enough to read comfortably)
  useEffect(() => {
    if (!isGenerating) {
      setCurrentMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % 3);
    }, 20000); // Changed to 20 seconds for comfortable reading
    
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Detect ALL languages in text (for bilingual content)
  const detectLanguages = (text: string): string[] => {
    if (!text || text.length < 15) return [];
    
    const detected: string[] = [];
    const textLower = text.toLowerCase();
    const words = textLower.split(/[\s,.;:!?()"\-]+/).filter(w => w.length > 0);
    
    const languageProfiles: Record<string, string[]> = {
      "English": ["the", "and", "is", "of", "to", "in", "that", "it", "with", "as", "you", "are", "have", "not"],
      "Norwegian": ["og", "er", "det", "som", "en", "av", "på", "til", "med", "har", "ikke", "jeg", "vi", "å"],
      "Spanish": ["de", "la", "que", "el", "en", "y", "a", "los", "se", "del", "las", "por", "un", "una"],
      "French": ["de", "la", "le", "et", "les", "des", "en", "un", "du", "une", "est", "pour", "que", "qui"],
      "German": ["der", "die", "und", "in", "den", "von", "zu", "das", "mit", "sich", "auf", "für", "ist", "nicht"],
      "Italian": ["di", "e", "il", "la", "che", "in", "a", "per", "un", "del", "non", "sono", "le", "con"],
      "Portuguese": ["de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "com", "nao", "os", "sua"],
      "Dutch": ["de", "en", "van", "ik", "te", "dat", "die", "in", "een", "hij", "het", "niet", "is", "op"],
      "Swedish": ["och", "i", "är", "det", "som", "till", "en", "av", "för", "att", "med", "inte", "på", "jag"],
      "Danish": ["og", "i", "er", "det", "som", "til", "en", "af", "for", "at", "med", "ikke", "jeg", "vi"],
      "Icelandic": ["og", "er", "að", "ekki", "við", "það", "fyrir", "með", "sem", "eru", "var", "hann", "hún"],
      "Polish": ["i", "w", "na", "z", "do", "nie", "się", "o", "że", "to", "jest", "od", "za"],
      "Russian": ["и", "в", "не", "на", "я", "что", "он", "с", "как", "это", "по", "за"],
      "Japanese": ["の", "に", "は", "を", "た", "が", "で", "て", "と", "し"],
      "Chinese": ["的", "一", "是", "在", "不", "了", "有", "和", "人"],
      "Korean": ["은", "는", "이", "가", "을", "를", "의", "에", "로"],
    };
    
    // Score each language
    const scores: Record<string, number> = {};
    Object.entries(languageProfiles).forEach(([lang, stopWords]) => {
      let score = 0;
      words.forEach(word => {
        if (stopWords.includes(word)) score++;
      });
      
      // Bonus for special characters
      if (lang === "Norwegian" && /[æøå]/.test(textLower)) score += 5;
      if (lang === "Swedish" && /[äöå]/.test(textLower)) score += 5;
      if (lang === "German" && /[üöäß]/.test(textLower)) score += 5;
      if (lang === "Spanish" && /[ñ¿¡]/.test(textLower)) score += 5;
      if (lang === "French" && /[àèéêç]/.test(textLower)) score += 3;
      if (lang === "Icelandic" && /[ðþ]/.test(textLower)) score += 10;
      if (lang === "Russian" && /[а-я]/.test(textLower)) score += 10;
      if (lang === "Japanese" && /[\u3040-\u309F\u30A0-\u30FF]/.test(text)) score += 10;
      if (lang === "Chinese" && /[\u4E00-\u9FFF]/.test(text)) score += 10;
      if (lang === "Korean" && /[\uAC00-\uD7AF]/.test(text)) score += 10;
      
      if (score > 0) scores[lang] = score;
    });
    
    // Get languages with significant scores
    const sortedLangs = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score >= 2); // Min threshold
    
    // If bilingual content, return top 2, otherwise top 1
    if (sortedLangs.length >= 2 && sortedLangs[1][1] >= sortedLangs[0][1] * 0.3) {
      // Second language has at least 30% of top score - likely bilingual
      return [sortedLangs[0][0], sortedLangs[1][0]];
    } else if (sortedLangs.length > 0) {
      return [sortedLangs[0][0]];
    }
    
    return [];
  };
  
  // Legacy single language detection
  const detectLanguage = (text: string): string => {
    const langs = detectLanguages(text);
    return langs.length > 0 ? langs[0] : "unknown";
    
    // 1. Script Detection (Unicode Ranges) - accurate for non-Latin
    if (/[а-яА-Я]/.test(text)) return "Cyrillic (Russian/Ukrainian)";
    if (/[\u0600-\u06FF]/.test(text)) return "Arabic";
    if (/[\u4E00-\u9FFF]/.test(text)) return "Chinese";
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "Japanese";
    if (/[\uAC00-\uD7AF]/.test(text)) return "Korean";
    if (/[\u0370-\u03FF]/.test(text)) return "Greek";
    if (/[\u0590-\u05FF]/.test(text)) return "Hebrew";

    // 2. Stop Word Analysis for Latin Script
    const textLower = text.toLowerCase();
    const words = textLower.split(/[\s,.;:!?()"\-]+/).filter(w => w.length > 0);
    
    const languageProfiles: Record<string, string[]> = {
      "English": ["the", "and", "is", "of", "to", "in", "that", "it", "with", "as", "you", "are", "have", "not"],
      "Norsk (Norwegian)": ["og", "er", "det", "som", "en", "av", "på", "til", "med", "har", "ikke", "jeg", "vi", "å"],
      "Español (Spanish)": ["de", "la", "que", "el", "en", "y", "a", "los", "se", "del", "las", "por", "un", "una"],
      "Français (French)": ["de", "la", "le", "et", "les", "des", "en", "un", "du", "une", "est", "pour", "que", "qui"],
      "Deutsch (German)": ["der", "die", "und", "in", "den", "von", "zu", "das", "mit", "sich", "auf", "für", "ist", "nicht"],
      "Italiano (Italian)": ["di", "e", "il", "la", "che", "in", "a", "per", "un", "del", "non", "sono", "le", "con"],
      "Português (Portuguese)": ["de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "com", "nao", "os", "sua"],
      "Nederlands (Dutch)": ["de", "en", "van", "ik", "te", "dat", "die", "in", "een", "hij", "het", "niet", "is", "op"],
      "Svenska (Swedish)": ["och", "i", "är", "det", "som", "till", "en", "av", "för", "att", "med", "inte", "på", "jag"],
      "Dansk (Danish)": ["og", "i", "er", "det", "som", "til", "en", "af", "for", "at", "med", "ikke", "jeg", "vi"],
    };

    let maxScore = 0;
    let detected = "English"; // Default fallback
    
    // Check Norwegian characters explicitly
    const hasNorwegianChars = /[æøåÆØÅ]/.test(text);

    Object.entries(languageProfiles).forEach(([lang, stopWords]) => {
      let score = 0;
      words.forEach(word => {
        if (stopWords.includes(word)) score++;
      });
      
      // Bonus weighting for specific characters
      if (lang === "Norsk (Norwegian)" && hasNorwegianChars) score += 5;
      if (lang === "Dansk (Danish)" && hasNorwegianChars) score += 5;
      if (lang === "Svenska (Swedish)" && /[äöå]/.test(textLower)) score += 5;
      if (lang === "Deutsch (German)" && /[üöäß]/.test(textLower)) score += 5;
      if (lang === "Español (Spanish)" && /[ñ¿¡]/.test(textLower)) score += 5;
      if (lang === "Français (French)" && /[àèéêç]/.test(textLower)) score += 2;

      if (score > maxScore) {
        maxScore = score;
        detected = lang;
      }
    });

    console.log(`[Language Detection] Winner: ${detected} (Score: ${maxScore})`);

    // Disambiguation for deeply similar languages (Scanning specific exclusive words)
    if (detected.includes("Norwegian") || detected.includes("Danish") || detected.includes("Swedish")) {
        // "ikke" = NO/DK, "inte" = SE
        if (words.includes("inte")) return "Svenska (Swedish)";
        
        // "av" = NO/SE, "af" = DK
        if (words.includes("af")) return "Dansk (Danish)";
        if (words.includes("av") && detected.includes("Danish")) return "Norsk (Norwegian)"; 
    }

    // Require a minimum confidence for non-Latin matches if short text, but here we handled length < 15 check
    if (maxScore === 0 && text.length > 50) return "unknown"; 

    return detected;
  };

  // Update detected language when text changes
  useEffect(() => {
    if (textInput && textInput.length >= 50) {
      const lang = detectLanguage(textInput);
      const langs = detectLanguages(textInput);
      setDetectedLanguage(lang);
      setDetectedLanguages(langs);
      
      // Auto-set language pairs for Languages subject if 2 detected
      if (isLanguageSubject && langs.length === 2 && !knownLanguage && !learningLanguage) {
        // Default: first detected = learning, second = known
        setLearningLanguage(langs[0]);
        setKnownLanguage(langs[1]);
      }
    } else {
      setDetectedLanguage(null);
      setDetectedLanguages([]);
    }
  }, [textInput]);

  // Listen for premium status changes (e.g., after successful purchase)
  useEffect(() => {
    const handlePremiumStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[CreateFlowView] 📢 Received premiumStatusChanged event:', customEvent.detail);
      
      // Re-check premium status immediately
      setTimeout(() => {
        console.log('[CreateFlowView] 🔄 Re-checking premium status after purchase...');
        checkPremiumStatus();
      }, 100);
    };

    window.addEventListener('premiumStatusChanged', handlePremiumStatusChange);
    return () => window.removeEventListener('premiumStatusChanged', handlePremiumStatusChange);
  }, []);

  // Debug: Log whenever isPremium changes
  useEffect(() => {
    console.log('[CreateFlowView] 🎯 isPremium STATE CHANGED TO:', isPremium);
    console.log('[CreateFlowView] Stack trace:', new Error().stack);
  }, [isPremium]);

  const checkPremiumStatus = async () => {
    console.log('[CreateFlowView] ===== STARTING PREMIUM CHECK =====');
    try {
      if (!supabase) {
        console.log('[CreateFlowView] Supabase not configured');
        setIsPremium(false);
        setPremiumCheckLoading(false);
        return;
      }

      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[CreateFlowView] Session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError
      });
      
      if (sessionError || !session) {
        console.log('[CreateFlowView] ❌ No session found - user not logged in');
        setIsPremium(false);
        setPremiumCheckLoading(false);
        return;
      }

      // Call the API with the auth token
      const response = await fetch('/api/premium/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CreateFlowView] ✅ Premium status received:', data);
        console.log('[CreateFlowView] 🎯 Setting isPremium to:', data.isPremium);
        console.log('[CreateFlowView] 🔍 API Response full data:', JSON.stringify(data, null, 2));
        console.log('[CreateFlowView] 🔍 data.isPremium type:', typeof data.isPremium);
        console.log('[CreateFlowView] 🔍 data.isPremium === true:', data.isPremium === true);
        console.log('[CreateFlowView] 🔍 data.isPremium === false:', data.isPremium === false);
        
        setIsPremium(data.isPremium);
        console.log('[CreateFlowView] ✅ setIsPremium CALLED with:', data.isPremium);
        
        setSetsCreated(data.setsCreated);
        setCanCreateMore(data.canCreateMore);
        
        // Use the server-side daily count if available, otherwise fallback to client-side check
        if (data.remainingDailyGenerations !== undefined) {
          setRemainingGenerations(data.isPremium ? 3 : Math.max(0, 3 - data.dailyAiCount));
        } else {
          const remaining = getRemainingGenerations(session?.user?.id || '', data.isPremium);
          setRemainingGenerations(remaining);
        }
        
        console.log('[CreateFlowView] ===== PREMIUM CHECK COMPLETE ===== isPremium:', data.isPremium);
      } else if (response.status === 401) {
        console.log('[CreateFlowView] ❌ User not authenticated - treating as free user');
        setIsPremium(false);
        const remaining = getRemainingGenerations('', false);
        setRemainingGenerations(remaining);
      } else {
        console.log('[CreateFlowView] ❌ Premium check API failed:', response.status);
        // Fallback to localStorage count
        const userId = getOrCreateUserId();
        const savedSets = await getSavedFlashcardSets();
        const userSets = savedSets.filter(set => set.userId === userId);
        setSetsCreated(userSets.length);
        const remaining = getRemainingGenerations(userId, false);
        setRemainingGenerations(remaining);
        setCanCreateMore(userSets.length < 3);
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Premium check failed:', error);
      // Fallback to localStorage count
      const userId = getOrCreateUserId();
      const savedSets = await getSavedFlashcardSets();
      const userSets = savedSets.filter(set => set.userId === userId);
      setSetsCreated(userSets.length);
      setCanCreateMore(userSets.length < 3);
      setIsPremium(false);
    } finally {
      setPremiumCheckLoading(false);
    }
  };

  // Subject examples
  const getSubjectExamples = () => [
    { name: settings.language === "no" ? "Språk" : "Languages" },
    { name: settings.language === "no" ? "Matte" : "Math" },
    { name: settings.language === "no" ? "Biologi" : "Biology" },
    { name: settings.language === "no" ? "Historie" : "History" },
    { name: settings.language === "no" ? "Naturfag" : "Chemistry" },
    { name: settings.language === "no" ? "Fysikk" : "Physics" }
  ];

  // Grade options with descriptions - adapts to selected grade system
  const getGradeOptions = (): { grade: Grade; label: string; description: string }[] => {
    if (settings.gradeSystem === "1-6") {
      return [
        { grade: "A", label: `6 — ${t("excellence")}`, description: t("master_every_detail") },
        { grade: "B", label: `5 — ${t("very_good")}`, description: t("strong_understanding") },
        { grade: "C", label: `4 — ${t("good")}`, description: t("solid_foundations") },
        { grade: "D", label: `3 — ${t("satisfactory")}`, description: t("core_concepts") },
        { grade: "E", label: `2 — ${t("passing")}`, description: t("essential_knowledge") }
      ];
    } else if (settings.gradeSystem === "percentage") {
      return [
        { grade: "A", label: `90-100% — ${t("excellence")}`, description: t("master_every_detail") },
        { grade: "B", label: `80-89% — ${t("very_good")}`, description: t("strong_understanding") },
        { grade: "C", label: `70-79% — ${t("good")}`, description: t("solid_foundations") },
        { grade: "D", label: `60-69% — ${t("satisfactory")}`, description: t("core_concepts") },
        { grade: "E", label: `50-59% — ${t("passing")}`, description: t("essential_knowledge") }
      ];
    } else {
      // Default A-F system
      return [
        { grade: "A", label: `A — ${t("excellence")}`, description: t("master_every_detail") },
        { grade: "B", label: `B — ${t("very_good")}`, description: t("strong_understanding") },
        { grade: "C", label: `C — ${t("good")}`, description: t("solid_foundations") },
        { grade: "D", label: `D — ${t("satisfactory")}`, description: t("core_concepts") },
        { grade: "E", label: `E — ${t("passing")}`, description: t("essential_knowledge") }
      ];
    }
  };

  // Map grade to difficulty settings
  const getGenerationSettings = (grade: Grade) => {
    // Free users can use up to 20 cards (C, D, E), Premium gets up to 30
    const maxCards = isPremium ? 30 : 20;
    
    const settings = {
      A: { cardCount: Math.min(30, maxCards), difficulty: "comprehensive", quizStrictness: "strict" },
      B: { cardCount: Math.min(25, maxCards), difficulty: "thorough", quizStrictness: "moderate" },
      C: { cardCount: Math.min(20, maxCards), difficulty: "standard", quizStrictness: "moderate" },
      D: { cardCount: Math.min(15, maxCards), difficulty: "focused", quizStrictness: "lenient" },
      E: { cardCount: Math.min(10, maxCards), difficulty: "essential", quizStrictness: "lenient" }
    };
    return settings[grade];
  };

  // Get actual card counts for display (not limited by premium status)
  const getActualCardCount = (grade: Grade) => {
    const counts = {
      A: 30,
      B: 25,
      C: 20,
      D: 15,
      E: 10
    };
    return counts[grade];
  };

  // Step navigation
  const handleContinueFromStep1 = () => {
    if (!subject.trim()) {
      setError(messages.errors.subjectRequired);
      return;
    }
    
    // For Languages subject, validation happens in step 2 after text is entered
    // (we need to detect languages from text first)
    
    setError("");
    setCurrentStep(2);
  };

  const handleContinueFromStep2 = () => {
    if (!selectedMaterial) {
      setError(messages.errors.materialTypeRequired);
      return;
    }
    
    if (selectedMaterial === "notes" && !textInput.trim()) {
      setError(messages.errors.notesRequired);
      return;
    }
    
    // Check for file uploads
    if ((selectedMaterial === "docx" || selectedMaterial === "image") && !uploadedFile) {
      setError(messages.errors.fileRequired);
      return;
    }
    
    // Validate language selection for Languages subject
    if (isLanguageSubject) {
      if (detectedLanguages.length < 2) {
        setError(settings.language === "no"
          ? "Lim inn tekst med to språk (f.eks. 'perro - hund') for språklæring"
          : "Paste text with two languages (e.g., 'perro - dog') for language learning");
        return;
      }
      if (!knownLanguage || !learningLanguage) {
        setError(settings.language === "no"
          ? "Velg hvilket språk du kan og hvilket du lærer"
          : "Select which language you know and which you're learning");
        return;
      }
      if (knownLanguage === learningLanguage) {
        setError(settings.language === "no"
          ? "Språkene må være forskjellige"
          : "Languages must be different");
        return;
      }
    }
    
    setError("");
    setCurrentStep(3);
  };

  const handleContinueFromStep3 = () => {
    if (!targetGrade) {
      setError(messages.errors.gradeRequired);
      return;
    }
    
    setError("");
    setCurrentStep(4);
    handleGenerate();
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep((prev) => (prev - 1) as Step);
      setError("");
    }
  };

  // Multi-image handling (Premium only)
  const handleMultiImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxImages = 5;
    
    if (files.length > maxImages) {
      setError(messages.errors.tooManyImages);
      return;
    }
    
    // Validate all are images
    const nonImages = files.filter(f => !f.type.startsWith('image/'));
    if (nonImages.length > 0) {
      setError(messages.errors.invalidFileType);
      return;
    }
    
    setSelectedImages(files);
    setError("");
  };

  const handleProcessImages = async () => {
    if (selectedImages.length === 0) return;
    
    console.log('[CreateFlow] Starting GPT-4 Vision image processing...');
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);
    setIsGenerating(true);
    setError("");
    
    try {
      // Convert images to base64
      console.log(`[CreateFlow] Converting ${selectedImages.length} images to base64...`);
      const base64Images: string[] = [];
      
      for (let i = 0; i < selectedImages.length; i++) {
        const imageFile = selectedImages[i];
        console.log(`[CreateFlow] Converting image ${i + 1}/${selectedImages.length}: ${imageFile.name}`);
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        
        base64Images.push(base64);
      }
      
      console.log(`[CreateFlow] ✅ All images converted. Sending to GPT-4 Vision API...`);
      
      // Send to our backend API
      const response = await fetch('/api/extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: base64Images }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text from images');
      }
      
      const data = await response.json();
      
      console.log(`[CreateFlow] ✅ GPT-4 Vision extraction complete!`);
      console.log(`  - Processed: ${data.imagesProcessed}/${data.totalImages} images`);
      console.log(`  - Total characters: ${data.text.length}`);
      console.log(`  - Preview: ${data.text.substring(0, 150)}...`);
      
      if (!data.text || data.text.length < 50) {
        throw new Error('Could not extract enough educational content from the images. Please make sure the images contain readable text.');
      }
      
      setTextInput(data.text);
      setError("");
    } catch (err: any) {
      console.error('[CreateFlow] Error processing images:', err);
      setError(err.message || messages.errors.imageProcessingFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  // File handling (for PDF, DOCX, and single image with OCR)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError("");

    // For PDF, extract text client-side
    if (file.type === "application/pdf") {
      try {
        setError(""); // Clear any previous errors
        console.log("📑 Extracting PDF client-side...");
        
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        console.log("📑 PDF loaded, size:", arrayBuffer.byteLength);
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log("📑 PDF pages:", pdf.numPages);
        
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }
        
        const trimmedText = fullText.trim();
        console.log("📑 Extracted text length:", trimmedText.length);
        console.log("📑 First 200 chars:", trimmedText.substring(0, 200));
        
        if (trimmedText.length < 20) {
          setError(messages.errors.textTooShort); 
          return;
        }
        
        setTextInput(trimmedText);
        console.log("✅ PDF extraction successful");
      } catch (err: any) {
        console.error("❌ PDF extraction failed:", err);
        setError(messages.errors.uploadFailed); // FIX: Use uploadFailed
      }
    } else if (file.type.startsWith("image/")) {
      // Handle image with GPT-4 Vision API
      try {
        console.log('[CreateFlowView] Processing single image with GPT-4 Vision...');
        
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Send to vision API
        const response = await fetch('/api/extract-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ images: [base64] }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to extract text from image');
        }
        
        const data = await response.json();
        const extractedText = data.text;
        
        if (!extractedText || extractedText.trim().length === 0) {
          setError(t("no_text_image"));
          return;
        }
        
        console.log('[CreateFlowView] ✅ GPT-4 Vision extracted:', extractedText.length, 'characters');
        setTextInput(extractedText);
      } catch (err: any) {
        console.error('[CreateFlowView] Image extraction error:', err);
        setError(err.message || "Failed to extract text from image. Please try another image.");
      }
    } else {
      // For DOCX, use the API
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to extract text");

        const data = await response.json();
        setTextInput(data.text || "");
        if (data.metadata?.language) {
          setDetectedLanguage(data.metadata.language);
          console.log("[CreateFlowView] Detected language:", data.metadata.language);
        }
      } catch (err) {
        setError("Failed to extract text from file. Please try another format.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!targetGrade) return;
    
    // Check if free user has hit study set limit - check ACTUAL saved sets, not just state
    if (!isPremium) {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || getOrCreateUserId();
      const savedSets = await getSavedFlashcardSets();
      const userSets = savedSets.filter(set => set.userId === userId);
      
      if (userSets.length >= 3) {
        setError("You've reached your limit of 3 free study sets. Upgrade to Premium for unlimited study sets!");
        setShowPremiumModal(true);
        setCurrentStep(1); // Go back to step 1
        return;
      }
    }
    
    // Wait for Premium check to complete if still loading
    if (premiumCheckLoading) {
      console.log('[CreateFlowView] Waiting for Premium check...');
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!premiumCheckLoading) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 100);
      });
    }
    
    // Check rate limit BEFORE generating
    const currentUser = await getCurrentUser();
    const userId = currentUser?.id || null;
    console.log('[CreateFlowView] ========================================');
    console.log('[CreateFlowView] 🔍 RATE LIMIT CHECK');
    console.log('[CreateFlowView] isPremium:', isPremium);
    console.log('[CreateFlowView] userId:', userId);
    console.log('[CreateFlowView] premiumCheckLoading:', premiumCheckLoading);
    console.log('[CreateFlowView] ========================================');
    const rateLimit = checkAIRateLimit(userId, isPremium);
    console.log('[CreateFlowView] Rate limit result:', rateLimit);
    
    if (!rateLimit.allowed) {
      setError(rateLimit.reason || messages.errors.generationTooShort);
      setShowPremiumModal(true);
      // Don't continue to generation if rate limited
      setCurrentStep(1);
      return;
    }
    
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);
    setIsGenerating(true);
    setError("");

    try {
      const settings = getGenerationSettings(targetGrade);
      
      // Prepare the text to send
      let textToProcess = "";
      
      console.log('[CreateFlowView] 📝 Preparing text for generation...');
      console.log('[CreateFlowView] selectedMaterial:', selectedMaterial);
      console.log('[CreateFlowView] textInput length:', textInput.length);
      console.log('[CreateFlowView] textInput preview:', textInput.substring(0, 200));
      
      if (selectedMaterial === "notes" || selectedMaterial === "image") {
        textToProcess = textInput;
        console.log('[CreateFlowView] Using textInput directly');
      } else if (selectedMaterial === "docx" && textInput) {
        textToProcess = textInput;
      }

      if (!textToProcess.trim()) {
        throw new Error("No content to generate flashcards from");
      }

      console.log('[CreateFlowView] 🚀 About to generate flashcards with:');
      console.log('[CreateFlowView] - Text length:', textToProcess.length);
      console.log('[CreateFlowView] - Subject:', subject);
      console.log('[CreateFlowView] - Target grade:', targetGrade);
      console.log('[CreateFlowView] - Card count:', settings.cardCount);
      console.log('[CreateFlowView] - First 300 chars:', textToProcess.substring(0, 300));

      // Get userId for premium checks
      const userIdForGen = userId || getOrCreateUserId();

      // FINAL CHECK: Verify free user hasn't hit limit (double-check before generation)
      if (!isPremium) {
        const latestSets = await getSavedFlashcardSets();
        const latestUserSets = latestSets.filter(set => set.userId === userIdForGen);
        if (latestUserSets.length >= 3) {
          throw new Error("You've reached your limit of 3 free study sets. Upgrade to Premium for unlimited study sets!");
        }
      }

      // Generate flashcards with metadata
      const cards = await generateFlashcards(
        textToProcess,
        settings.cardCount,
        subject,
        targetGrade,
        userIdForGen,
        selectedMaterial || "notes",
        outputLanguage || "auto",
        difficulty,
        includeMathProblems && isMathSubject,
        isLanguageSubject ? knownLanguage : undefined,
        isLanguageSubject ? learningLanguage : undefined
      );

      // Increment rate limit counter AFTER successful generation
      if (userId && !isPremium) {
        incrementAIUsage(userId);
        // Update the display counter
        setRemainingGenerations(Math.max(0, remainingGenerations - 1));
      }

      onGenerateFlashcards(cards, subject, targetGrade);
      
      // Refresh premium status after successful generation
      await checkPremiumStatus();
    } catch (err: any) {
      console.error('[CreateFlowView] Generation error:', err.message);
      
      // Handle premium-related errors
      if (err.message === "PREMIUM_REQUIRED" || err.message.includes("Upgrade to Premium")) {
        setIsDailyLimit(false);
        setShowPremiumModal(true);
        setIsGenerating(false);
        setCurrentStep(2);
        return;
      }
      
      if (err.message === "DAILY_LIMIT_REACHED" || err.message.includes("daily")) {
        setError("You've reached your daily limit. Upgrade to Premium for unlimited generations!");
        setIsGenerating(false);
        setCurrentStep(2);
        setIsDailyLimit(true);
        setTimeout(() => setShowPremiumModal(true), 300);
        return;
      }

      // Map error codes to user-friendly messages
      const errorMessages: Record<string, { title: string; suggestion: string }> = {
        "AI_GENERATION_FAILED": {
          title: "Couldn't generate flashcards this time",
          suggestion: "Try again with different notes, or use shorter text."
        },
        "AI_EMPTY_RESPONSE": {
          title: "The AI couldn't find enough content",
          suggestion: "Make sure your notes contain clear facts and concepts to study."
        },
        "AI_TIMEOUT": {
          title: "Generation took too long",
          suggestion: "Try with shorter notes or fewer flashcards."
        },
        "AI_CONNECTION_ERROR": {
          title: "Connection issue",
          suggestion: "Check your internet and try again."
        },
        "AI_RATE_LIMITED": {
          title: "Too many requests",
          suggestion: "Please wait a moment and try again."
        },
        "AI_SERVICE_UNAVAILABLE": {
          title: "AI service is busy",
          suggestion: "Try again in a few seconds."
        },
        "AI_PARSE_ERROR": {
          title: "Something went wrong with the AI",
          suggestion: "Try again — this usually works on retry."
        },
        "AI_AUTH_ERROR": {
          title: "Service error",
          suggestion: "Please contact support if this continues."
        }
      };

      // Find matching error or use default
      let errorInfo = errorMessages["AI_GENERATION_FAILED"];
      for (const [code, info] of Object.entries(errorMessages)) {
        if (err.message?.includes(code)) {
          errorInfo = info;
          break;
        }
      }

      setError(`${errorInfo.title}. ${errorInfo.suggestion}`);
      setIsGenerating(false);
      setCurrentStep(2);
    }
  };

  return (
    <>
      <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
        {/* Top bar med logo */}
        <div className="sticky top-0 z-50 px-4 py-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="text-2xl font-black text-white">
              StudyMaxx
            </div>
            {hasSession && (
              <div className="text-sm text-slate-400 font-semibold">
                {isPremium ? "⭐ Premium" : `${remainingGenerations}/3 free`}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-6 max-w-2xl mx-auto">
          {/* Header with progress */}
          <div className="mb-4">
          <button
            onClick={handleBack}
            className="mb-2 px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 shadow-md hover:scale-105 hover:shadow-lg"
            style={{
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '2px solid var(--border)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#06b6d4';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-500 ease-out",
                  step === currentStep && "animate-pulse"
                )}
                style={{
                  width: step === currentStep ? '4rem' : '2rem',
                  background: step === currentStep 
                    ? 'linear-gradient(90deg, #06b6d4 0%, #14b8a6 50%, #10b981 100%)'
                    : step < currentStep
                    ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                    : 'var(--border)',
                  boxShadow: step === currentStep ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none'
                }}
              />
            ))}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-center mb-1" style={{ color: 'var(--foreground)' }}>
            {t("create_study_set")}
          </h1>
          <p className="text-center text-sm text-muted-foreground">Transform your notes into study tools</p>
        </div>

        {/* Main content card */}
        <div className="card-elevated p-4">
          {/* Error message */}
          {error && (
            <div className="mb-3 p-3 rounded-lg" style={{ 
              background: 'var(--error-light)',
              border: '1px solid var(--error)',
              color: 'var(--error)'
            }}>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* STEP 1: Choose Subject */}
          {currentStep === 1 && (
            <div className="space-y-3">
              {/* Daily limit banner - only show when needed */}
              {!premiumCheckLoading && !isPremium && hasSession && remainingGenerations < 3 && remainingGenerations >= 0 && (
                <div className="p-2 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    {remainingGenerations} of 3 free generations left today
                  </p>
                </div>
              )}

              <div className="mb-3">
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Choose subject
                </h2>
              </div>

              {/* Subject selection buttons */}
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {getSubjectExamples().map((example) => (
                    <Card
                      key={example.name}
                      onClick={() => setSubject(example.name)}
                      className="cursor-pointer transition-all duration-200 border-2 rounded-md overflow-hidden"
                      style={{
                        background: subject === example.name 
                          ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                          : 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
                        borderColor: subject === example.name ? '#0891b2' : 'rgba(6, 182, 212, 0.3)',
                        boxShadow: subject === example.name
                          ? '0 4px 20px rgba(6, 182, 212, 0.4)'
                          : '0 2px 10px rgba(6, 182, 212, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        if (subject !== example.name) {
                          e.currentTarget.style.borderColor = '#06b6d4';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.1) 100%)';
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (subject !== example.name) {
                          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)';
                          e.currentTarget.style.boxShadow = '0 2px 10px rgba(6, 182, 212, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <span className="font-semibold text-base" style={{ color: subject === example.name ? 'white' : 'var(--foreground)' }}>{example.name}</span>
                        {subject === example.name && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Other button */}
                  <Card
                    onClick={() => setSubject("Other")}
                    className="cursor-pointer transition-all duration-200 md:col-span-3 lg:col-span-3 border-2 rounded-md overflow-hidden"
                    style={{
                      background: subject === "Other"
                        ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                        : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.08) 100%)',
                      borderColor: subject === "Other" ? '#0891b2' : 'rgba(6, 182, 212, 0.4)',
                      boxShadow: subject === "Other"
                        ? '0 4px 20px rgba(6, 182, 212, 0.4)'
                        : '0 2px 10px rgba(6, 182, 212, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                      if (subject !== "Other") {
                        e.currentTarget.style.borderColor = '#06b6d4';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(8, 145, 178, 0.15) 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (subject !== "Other") {
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.08) 100%)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(6, 182, 212, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <CardContent className="p-4 flex items-center justify-center gap-2">
                      <span className="font-semibold text-base" style={{ color: subject === "Other" ? 'white' : 'var(--foreground)' }}>✨ Other Subject</span>
                      {subject === "Other" && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Language Selection - Only show when Languages subject is selected */}
              {isLanguageSubject && (
                <div className="space-y-3 mt-4">
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--foreground)' }}>
                      {settings.language === "no" ? "Språkinnstillinger" : "Language Settings"}
                    </h3>
                    
                    {detectedLanguages.length >= 2 ? (
                      <>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          {settings.language === "no" 
                            ? `Detekterte språk: ${detectedLanguages.join(" + ")}` 
                            : `Detected languages: ${detectedLanguages.join(" + ")}`}
                        </p>
                        
                        {/* Known Language */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            {settings.language === "no" ? "Jeg kan:" : "I know:"}
                          </label>
                          <select
                            value={knownLanguage}
                            onChange={(e) => setKnownLanguage(e.target.value)}
                            className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <option value="">{settings.language === "no" ? "Velg språk" : "Select language"}</option>
                            {detectedLanguages.map(lang => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </select>
                        </div>

                        {/* Learning Language */}
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            {settings.language === "no" ? "Jeg lærer:" : "I'm learning:"}
                          </label>
                          <select
                            value={learningLanguage}
                            onChange={(e) => setLearningLanguage(e.target.value)}
                            className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <option value="">{settings.language === "no" ? "Velg språk" : "Select language"}</option>
                            {detectedLanguages.map(lang => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </select>
                        </div>

                        {knownLanguage && learningLanguage && knownLanguage !== learningLanguage && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                            ✓ {settings.language === "no" 
                              ? `Lærer ${learningLanguage} fra ${knownLanguage}` 
                              : `Learning ${learningLanguage} from ${knownLanguage}`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {settings.language === "no" 
                          ? "Lim inn tekst med to språk (f.eks. 'perro - hund') i neste steg for å detektere språkene automatisk" 
                          : "Paste text with two languages (e.g., 'perro - dog') in the next step to auto-detect languages"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Continue button */}
              <button
                onClick={handleContinueFromStep1}
                disabled={!subject.trim()}
                className="w-full py-4 rounded-md text-lg font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-[0_0_30px_rgba(20,184,166,0.6)] hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 hover:shadow-[0_0_40px_rgba(20,184,166,0.8)] hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}

          {/* STEP 2: Add Learning Material */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="mb-3">
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Add material
                </h2>
              </div>

              {/* Material type selection */}
              {!selectedMaterial ? (
                <div className="grid grid-cols-1 gap-3">
                  {/* Notes (Free) */}
                  <Card
                    onClick={() => setSelectedMaterial("notes")}
                    className="cursor-pointer transition-all duration-300 border-2 rounded-md overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.12) 100%)',
                      borderColor: 'rgba(6, 182, 212, 0.4)',
                      boxShadow: '0 2px 12px rgba(6, 182, 212, 0.15)',
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(8, 145, 178, 0.2) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.25)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.12) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(6, 182, 212, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-md bg-gradient-to-br from-cyan-400/20 to-cyan-500/15 flex items-center justify-center text-3xl">
                          📝
                        </div>
                        <div>
                          <span className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                            Notes
                          </span>
                          <span className="text-xs block mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            Paste text
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-md border border-emerald-200 dark:border-emerald-800">
                        ✓ Free
                      </span>
                    </CardContent>
                  </Card>

                  {/* Word Document (Premium) */}
                  <Card
                    onClick={() => {
                        if (!isPremium) setShowPremiumModal(true);
                        else setSelectedMaterial("docx");
                    }}
                    className="cursor-pointer transition-all duration-300 border-2 rounded-md overflow-hidden"
                    style={{
                      background: isPremium 
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.12) 100%)'
                        : 'linear-gradient(135deg, rgba(100, 100, 100, 0.08) 0%, rgba(80, 80, 80, 0.05) 100%)',
                      borderColor: isPremium ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.3)',
                      boxShadow: isPremium 
                        ? '0 2px 12px rgba(6, 182, 212, 0.15)'
                        : '0 2px 10px rgba(0, 0, 0, 0.05)',
                      backdropFilter: 'blur(10px)',
                      opacity: isPremium ? 1 : 0.85
                    }}
                    onMouseEnter={(e) => {
                      if (!isPremium) {
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.opacity = '0.95';
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(8, 145, 178, 0.2) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isPremium) {
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.opacity = '0.85';
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.12) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(6, 182, 212, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-md flex items-center justify-center text-3xl" style={{ 
                          background: isPremium ? 'linear-gradient(to-br, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.15))' : 'var(--muted)'
                        }}>
                          📄
                        </div>
                        <div>
                          <span className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                            Word Document
                          </span>
                          <span className="text-xs block mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            Upload .docx
                          </span>
                        </div>
                      </div>
                      {isPremium ? (
                        <span className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-bold rounded-md border border-cyan-200 dark:border-cyan-800">
                          ✓ Active
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-800">
                          🔒 Premium
                        </span>
                      )}
                    </CardContent>
                  </Card>

                  {/* Image (Premium) */}
                  <Card
                    onClick={() => {
                        if (!isPremium) setShowPremiumModal(true);
                        else setSelectedMaterial("image");
                    }}
                    className="cursor-pointer transition-all duration-300 border-2 rounded-md overflow-hidden"
                    style={{
                      background: isPremium 
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.12) 100%)'
                        : 'linear-gradient(135deg, rgba(100, 100, 100, 0.08) 0%, rgba(80, 80, 80, 0.05) 100%)',
                      borderColor: isPremium ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.3)',
                      boxShadow: isPremium 
                        ? '0 2px 12px rgba(6, 182, 212, 0.15)'
                        : '0 2px 10px rgba(0, 0, 0, 0.05)',
                      backdropFilter: 'blur(10px)',
                      opacity: isPremium ? 1 : 0.85
                    }}
                    onMouseEnter={(e) => {
                      if (!isPremium) {
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.opacity = '0.95';
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(8, 145, 178, 0.2) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isPremium) {
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.opacity = '0.85';
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.12) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(6, 182, 212, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-md flex items-center justify-center text-3xl" style={{ 
                          background: isPremium ? 'linear-gradient(to-br, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.15))' : 'var(--muted)'
                        }}>
                          🖼️
                        </div>
                        <div>
                          <span className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                            Image
                          </span>
                          <span className="text-xs block mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            Upload image
                          </span>
                        </div>
                      </div>
                      {isPremium ? (
                        <span className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-bold rounded-md border border-cyan-200 dark:border-cyan-800">
                          ✓ Active
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-800">
                          🔒 Premium
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Material input area */}
                  <div className="space-y-3">
                    {/* Show selected type */}
                    <Card className="border bg-slate-50 dark:bg-slate-800/50">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <span className="text-lg">
                              {selectedMaterial === "notes" && "📝"}
                              {selectedMaterial === "docx" && "📄"}
                              {selectedMaterial === "image" && "🖼️"}
                              </span>
                          </div>
                          <span className="font-medium text-sm">
                            {selectedMaterial === "notes" && t("notes")}
                            {selectedMaterial === "docx" && "Word Document"}
                            {selectedMaterial === "image" && t("image")}
                          </span>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedMaterial(null);
                            setTextInput("");
                            setUploadedFile(null);
                          }}
                          size="sm"
                          className="text-xs"
                        >
                          Change
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Notes input */}
                    {selectedMaterial === "notes" && (
                      <Textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={t("paste_notes_here")}
                        className="min-h-40 text-sm"
                        autoFocus
                      />
                    )}

                    {/* DOCX upload */}
                    {selectedMaterial === "docx" && (
                      <div>
                        <input
                          type="file"
                          id="docx-upload"
                          accept=".docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="docx-upload"
                          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 group ${
                            uploadedFile 
                              ? "bg-green-50/50 dark:bg-green-900/10 border-green-400/50 dark:border-green-800" 
                              : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600"
                          }`}
                        >
                          {uploadedFile ? (
                            <div className="text-center p-4">
                              <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl mb-2 text-green-600 dark:text-green-400">✅</div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                                Ready to process
                              </p>
                            </div>
                          ) : (
                            <div className="text-center p-3">
                              <div className="w-10 h-10 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-xl mb-2 shadow-sm border border-slate-100 dark:border-slate-700">📄</div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Upload Word Document
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Supports .docx files
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}

                   {/* YouTube input REMOVED */}

                    {/* Image upload */}
                    {selectedMaterial === "image" && (
                      <div>
                        {/* Premium check is done before selection, but checking here as secondary safeguard */}
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                         <label
                          htmlFor="image-upload"
                          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 group ${
                            uploadedFile 
                              ? "bg-green-50/50 dark:bg-green-900/10 border-green-400/50 dark:border-green-800" 
                              : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-600"
                          }`}
                        >
                          {uploadedFile ? (
                            <div className="text-center p-4">
                              <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl mb-2 text-green-600 dark:text-green-400">✅</div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                                {textInput.length > 0 ? `${textInput.length} chars extracted` : t("processing")}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center p-3">
                               <div className="w-10 h-10 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-xl mb-2 shadow-sm border border-slate-100 dark:border-slate-700">📷</div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Upload Image
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {t("jpg_png_formats")}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Language selection - only show when we have text */}
                  {textInput.length >= 50 && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                      <div className="mb-2 flex items-baseline justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Output Language
                        </h4>
                        {detectedLanguage && detectedLanguage !== "unknown" && (
                          <div className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-gray-400">
                            Detected: {detectedLanguage}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Card
                          onClick={() => setOutputLanguage("auto")}
                          className="cursor-pointer border-2 transition-all duration-200 rounded-md overflow-hidden"
                          style={{
                            background: outputLanguage === "auto"
                              ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                              : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)',
                            borderColor: outputLanguage === "auto" ? '#0891b2' : 'rgba(6, 182, 212, 0.3)',
                            boxShadow: outputLanguage === "auto" ? '0 4px 15px rgba(6, 182, 212, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                          }}
                          onMouseEnter={(e) => {
                            if (outputLanguage !== "auto") {
                              e.currentTarget.style.borderColor = '#06b6d4';
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.1) 100%)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (outputLanguage !== "auto") {
                              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)';
                            }
                          }}
                        >
                          <CardContent className="flex items-center justify-between p-3">
                           <div className="flex items-center gap-2">
                              <span className="text-lg">🌍</span>
                              <div className="text-left">
                                  <div className="font-medium text-sm" style={{ color: outputLanguage === "auto" ? 'white' : 'var(--foreground)' }}>
                                    {detectedLanguage && detectedLanguage !== "unknown" ? detectedLanguage.split(" ")[0] : "Auto"}
                                  </div>
                              </div>
                           </div>
                           {outputLanguage === "auto" && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </CardContent>
                        </Card>

                        <Card
                          onClick={() => setOutputLanguage("en")}
                          className="cursor-pointer border-2 transition-all duration-200 rounded-md overflow-hidden"
                          style={{
                            background: outputLanguage === "en"
                              ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                              : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)',
                            borderColor: outputLanguage === "en" ? '#0891b2' : 'rgba(6, 182, 212, 0.3)',
                            boxShadow: outputLanguage === "en" ? '0 4px 15px rgba(6, 182, 212, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                          }}
                          onMouseEnter={(e) => {
                            if (outputLanguage !== "en") {
                              e.currentTarget.style.borderColor = '#06b6d4';
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.1) 100%)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (outputLanguage !== "en") {
                              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)';
                            }
                          }}
                        >
                          <CardContent className="flex items-center justify-between p-3">
                           <div className="flex items-center gap-2">
                              <span className="text-lg">🇺🇸</span>
                              <div className="text-left">
                                  <div className="font-medium text-sm" style={{ color: outputLanguage === "en" ? 'white' : 'var(--foreground)' }}>English</div>
                              </div>
                           </div>
                           {outputLanguage === "en" && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Continue button */}
                  <Button
                    onClick={(e) => {
                      if (selectedMaterial === "image") {
                        handleContinueFromStep2();
                        return;
                      }
                      if (textInput.length >= 50 && !outputLanguage) {
                        e.preventDefault();
                        return;
                      }
                      handleContinueFromStep2();
                    }}
                    disabled={selectedMaterial !== "image" && textInput.length >= 50 && !outputLanguage}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {selectedMaterial !== "image" && textInput.length >= 50 && !outputLanguage ? "Select language" : t("continue")}
                    {!(selectedMaterial !== "image" && textInput.length >= 50 && !outputLanguage) && (
                      <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Choose Difficulty & Flashcard Count */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="mb-3">
                <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Set difficulty & card count
                </h2>
              </div>

              {/* Difficulty Selection */}
              <div>
                 <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                   Difficulty
                 </label>
                
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { level: "Easy", locked: !isPremium },
                    { level: "Medium", locked: false },
                    { level: "Hard", locked: !isPremium }
                  ].map(({ level, locked }) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        if (locked) {
                           setShowPremiumModal(true);
                           return;
                        }
                        setDifficulty(level);
                      }}
                      className="p-2.5 rounded-md border-2 transition-all duration-200 font-medium text-sm"
                      style={{
                        background: difficulty === level 
                          ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                          : locked 
                            ? 'linear-gradient(135deg, #334155 0%, #475569 100%)' 
                            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)',
                        borderColor: difficulty === level ? '#0891b2' : locked ? '#475569' : 'rgba(6, 182, 212, 0.3)',
                        color: difficulty === level || locked ? 'white' : 'var(--foreground)',
                        boxShadow: difficulty === level ? '0 4px 15px rgba(6, 182, 212, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        if (difficulty !== level && !locked) {
                          e.currentTarget.style.borderColor = '#06b6d4';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.1) 100%)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (difficulty !== level && !locked) {
                          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{level}</span>
                        {locked && (
                          <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        )}
                        {difficulty === level && !locked && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flashcard Count Selection */}
              <div>
                 <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                   {t("number_of_flashcards")}
                 </label>

                <div className="grid grid-cols-1 gap-2 mt-2">
                  {[
                    { count: 10, label: "10 cards", grade: "Pass", locked: false, desc: null },
                    { count: 15, label: "15 cards", grade: "Good", locked: false, desc: null },
                    { count: 20, label: "20 cards", grade: "Very Good", locked: false, desc: null },
                    { count: 25, label: "25 cards", grade: "Excellent", locked: !isPremium, desc: "Better grades" },
                    { count: 30, label: "30 cards", grade: "Top Grade", locked: !isPremium, desc: "Top results" }
                  ].map(({ count, label, grade: gradeText, locked, desc }) => {
                    // Map count to grade letter for backend
                    const gradeMap: Record<number, Grade> = { 10: "E", 15: "D", 20: "C", 25: "B", 30: "A" };
                    const gradeValue = gradeMap[count];
                    const isSelected = targetGrade === gradeValue;
                    
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            setShowPremiumModal(true);
                          } else {
                            setTargetGrade(gradeValue);
                          }
                        }}
                        className="rounded-md border-2 transition-all duration-200"
                        style={{
                          background: isSelected 
                            ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                            : locked 
                              ? 'linear-gradient(135deg, #334155 0%, #475569 100%)' 
                              : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)',
                          borderColor: isSelected ? '#0891b2' : locked ? '#475569' : 'rgba(6, 182, 212, 0.3)',
                          color: isSelected || locked ? 'white' : 'var(--foreground)',
                          boxShadow: isSelected ? '0 4px 15px rgba(6, 182, 212, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                          padding: desc ? '0.65rem' : '0.65rem'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && !locked) {
                            e.currentTarget.style.borderColor = '#06b6d4';
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.1) 100%)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected && !locked) {
                            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{label}</span>
                            {locked && (
                              <span className="text-base">🔒</span>
                            )}
                            {isSelected && !locked && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            )}
                          </div>
                          <span className={`text-xs font-medium ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
                            → {gradeText}
                          </span>
                        </div>
                        {desc && (
                          <div className={`mt-2 text-xs ${locked ? 'text-amber-400' : 'text-cyan-200'} font-medium`}>
                            {desc}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Math Problems Toggle - Only show for math subjects (Premium Feature) */}
              {isMathSubject && (
                <div 
                  onClick={() => {
                    if (!isPremium) {
                      setShowPremiumModal(true);
                    } else {
                      setIncludeMathProblems(!includeMathProblems);
                    }
                  }}
                  className="p-4 rounded-md border-2 cursor-pointer transition-all hover:scale-[1.01]" 
                  style={{ 
                    background: includeMathProblems && isPremium 
                      ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' 
                      : isPremium 
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(8, 145, 178, 0.04) 100%)'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                    borderColor: includeMathProblems && isPremium ? '#06b6d4' : isPremium ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.5)',
                    boxShadow: includeMathProblems && isPremium ? '0 4px 15px rgba(6, 182, 212, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧮</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: includeMathProblems && isPremium ? 'white' : 'var(--foreground)' }}>
                            Include Practice Problems
                          </span>
                          {!isPremium && <span className="text-base">🔒</span>}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: includeMathProblems && isPremium ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)' }}>
                          Add solvable math problems to practice {!isPremium && '(Premium)'}
                        </p>
                        <p className="text-[10px] mt-1 italic" style={{ color: includeMathProblems && isPremium ? 'rgba(255,255,255,0.7)' : '#f59e0b' }}>
                          ⚠️ Beta feature - Still being improved
                        </p>
                      </div>
                    </div>
                    {isPremium && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIncludeMathProblems(!includeMathProblems);
                        }}
                        className="relative w-12 h-6 rounded-full transition-all duration-200"
                        style={{
                          background: includeMathProblems ? 'white' : 'var(--muted)'
                        }}
                      >
                        <div 
                          className="absolute w-5 h-5 rounded-full top-0.5 transition-all duration-200"
                          style={{
                            left: includeMathProblems ? '26px' : '2px',
                            background: includeMathProblems ? '#06b6d4' : 'var(--muted-foreground)'
                          }}
                        />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Continue button */}
              <Button
                onClick={handleContinueFromStep3}
                disabled={!targetGrade}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {t("generate_study_set")} 
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </Button>
            </div>
          )}

          {/* STEP 4: Generating */}
          {currentStep === 4 && (
            <div className="py-8 text-center space-y-6 max-w-md mx-auto">
              {/* Central Animation */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-gray-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                <div className="absolute inset-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
              </div>
              
              <div className="space-y-2">
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t("creating_study_set")}
                 </h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                    Please wait...
                 </p>
              </div>
              
              {/* Premium Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <span>Start</span>
                  <span>{Math.round((elapsedSeconds / 75) * 100)}%</span>
                </div>
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${Math.min((elapsedSeconds / 75) * 100, 95)}%`,
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Dynamic Steps */}
              <div className="grid gap-3 text-left">
                {[
                   { label: settings.language === "no" ? "Analyserer innhold..." : "Analyzing content...", icon: "🔍", time: 0 },
                   { label: settings.language === "no" ? "Strukturerer flashcards..." : "Structuring flashcards...", icon: "📑", time: 25 },
                   { label: settings.language === "no" ? "Ferdigstiller settet..." : "Finalizing study set...", icon: "🚀", time: 50 },
                ].map((step, idx) => {
                   const isActive = elapsedSeconds >= step.time && (idx === 2 || elapsedSeconds < [25, 50, 999][idx]);
                   const isDone = elapsedSeconds >= [25, 50, 999][idx];
                   
                   return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-4 p-4 rounded-md border transition-all duration-500 ${
                            isDone 
                               ? "bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800"
                               : isActive
                               ? "bg-white border-indigo-200 shadow-md scale-[1.02] dark:bg-slate-800 dark:border-indigo-900"
                               : "bg-transparent border-transparent opacity-50"
                        }`}
                      >
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                            isDone 
                               ? "bg-green-500 text-white" 
                               : isActive
                               ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 animate-pulse"
                               : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                         }`}>
                            {isDone ? "✓" : step.icon}
                         </div>
                         <span className={`font-medium ${
                            isDone ? "text-green-700 dark:text-green-400 line-through decoration-green-300/50" : "text-gray-900 dark:text-white"
                         }`}>
                            {step.label}
                         </span>
                      </div>
                   );
                })}
              </div>

              {/* Fun Fact Card */}
              <div className="mt-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/50 rounded-md border border-amber-100/50 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <svg className="w-16 h-16 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                </div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                   <span>💡</span> {settings.language === "no" ? "Visste du?" : "Did you know?"}
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                  {[
                    settings.language === "no" 
                      ? "Å prøve å huske informasjon styrker hukommelsen mer enn å bare lese notater." 
                      : "Active recall recruits more neural networks than passive review.",
                    settings.language === "no"
                      ? "Korte, spredte økter over tid er mer effektive enn lange økter."
                      : "Spaced repetition can increase learning efficiency by up to 200%.",
                  ][Math.floor(elapsedSeconds / 25) % 2]}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal 
          isOpen={showPremiumModal}
          onClose={() => {
            setShowPremiumModal(false);
            setIsDailyLimit(false);
          }}
          setsCreated={setsCreated}
          isDailyLimit={isDailyLimit}
          onRequestLogin={onRequestLogin}
        />
      )}
    </>
  );
}
