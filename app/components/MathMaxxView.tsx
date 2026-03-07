"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSettings, useTranslation } from "../contexts/SettingsContext";
import katex from "katex";

const KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css";

// ============================================================
// TYPES
// ============================================================

interface MathMaxxViewProps {
  onBack: () => void;
  isPremium: boolean;
  user?: any;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

interface QuizQuestion {
  id: number;
  type: "multiple_choice";
  question: string;
  options?: string[];
  correct: string;
  explanation: string;
}

interface Quiz {
  title: string;
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
}

interface QuizResult {
  quiz: Quiz;
  answers: Record<number, string>;
  score: { correct: number; total: number };
  wrongQuestions: { question: string; userAnswer: string; correctAnswer: string; explanation: string }[];
}

// ============================================================
// CONSTANTS
// ============================================================

const FREE_MESSAGE_LIMIT = 5;
const DAILY_LIMITS = { chatMessages: Infinity, quizzes: Infinity };

// ============================================================
// RATE LIMITING (localStorage)
// ============================================================

function getDailyUsage(key: string): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(`mathmaxx_${key}`);
  if (!stored) return 0;
  try {
    const { count, date } = JSON.parse(stored);
    if (date !== new Date().toISOString().slice(0, 10)) return 0;
    return count;
  } catch { return 0; }
}

function incrementDailyUsage(key: string) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyUsage(key);
  localStorage.setItem(`mathmaxx_${key}`, JSON.stringify({ count: current + 1, date: today }));
}

function getFreeMessageCount(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem("mathmaxx_free_msgs");
  if (!stored) return 0;
  try {
    return JSON.parse(stored).count || 0;
  } catch { return 0; }
}

function incrementFreeMessages() {
  if (typeof window === "undefined") return;
  const current = getFreeMessageCount();
  localStorage.setItem("mathmaxx_free_msgs", JSON.stringify({ count: current + 1 }));
}

// ============================================================
// KATEX RENDERER
// ============================================================

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
        "\\Q": "\\mathbb{Q}",
        "\\C": "\\mathbb{C}",
      },
    });
  } catch {
    return `<code style="color:#ef4444">${latex}</code>`;
  }
}

/**
 * Convert Unicode math symbols to LaTeX in non-LaTeX segments of text.
 * This catches any Unicode symbols (√, ×, ÷, etc.) that the AI outputs
 * outside of proper $...$ LaTeX delimiters.
 */
function convertUnicodeMath(text: string): string {
  let r = text;
  // Roots: 2√3, √16, √(x+1)
  r = r.replace(/√\(([^)]+)\)/g, (_, e) => `$\\sqrt{${e}}$`);
  r = r.replace(/(\d+)√(\d+)/g, (_, c, n) => `$${c}\\sqrt{${n}}$`);
  r = r.replace(/√(\d+)/g, (_, n) => `$\\sqrt{${n}}$`);
  r = r.replace(/∛(\d+)/g, (_, n) => `$\\sqrt[3]{${n}}$`);
  // Superscripts
  r = r.replace(/(\w)²/g, (_, c) => `$${c}^{2}$`);
  r = r.replace(/(\w)³/g, (_, c) => `$${c}^{3}$`);
  // Operators
  r = r.replace(/×/g, '$\\times$');
  r = r.replace(/÷/g, '$\\div$');
  r = r.replace(/±/g, '$\\pm$');
  r = r.replace(/≤/g, '$\\leq$');
  r = r.replace(/≥/g, '$\\geq$');
  r = r.replace(/≠/g, '$\\neq$');
  r = r.replace(/∞/g, '$\\infty$');
  // Greek (standalone only)
  r = r.replace(/(?<![a-zA-Z])π(?![a-zA-Z])/g, '$\\pi$');
  r = r.replace(/(?<![a-zA-Z])θ(?![a-zA-Z])/g, '$\\theta$');
  return r;
}

function preprocessMathUnicode(text: string): string {
  // Split text into LaTeX regions ($$..$$ and $..$) and non-LaTeX regions
  // Only convert Unicode symbols in non-LaTeX segments
  const parts: string[] = [];
  const latexPattern = /(\$\$[\s\S]*?\$\$|\$[^\n$]+?\$)/g;
  let lastIdx = 0;
  let m;
  while ((m = latexPattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(convertUnicodeMath(text.slice(lastIdx, m.index)));
    }
    parts.push(m[0]);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(convertUnicodeMath(text.slice(lastIdx)));
  }
  return parts.join('');
}

function renderMathText(text: string): string {
  let result = text;
  // Strip markdown artifacts
  result = result.replace(/```[\s\S]*?```/g, "");
  result = result.replace(/`([^`]+)`/g, "$1");
  result = result.replace(/^#{1,6}\s*/gm, "");
  result = result.replace(/^---+$/gm, "");
  result = result.replace(/^\*\*\*+$/gm, "");
  result = result.replace(/^\/\/.*$/gm, "");
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  // Convert any Unicode math symbols to LaTeX (outside existing $ delimiters)
  result = preprocessMathUnicode(result);

  // Display math $$...$$ (must come first)
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => renderKatex(latex.trim(), true));
  // Inline math $...$
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, latex) => renderKatex(latex.trim(), false));
  // Basic text formatting
  result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/\n/g, "<br/>");

  return result;
}

// ============================================================
// SVG ICONS
// ============================================================

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

const QuizIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

// ============================================================
// MATH LANGUAGE OPTIONS
// ============================================================

const MATH_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
] as const;

// ============================================================
// I18N — MathMaxx-specific strings
// ============================================================

function getMathStrings(lang: string) {
  // Full translations for all 20 supported languages
  const translations: Record<string, Record<string, string>> = {
    en: {
      welcome: "Welcome to MathMaxx", welcomeSub: "Your AI math tutor. Ask me anything about math and I will explain it step by step.",
      chat: "Chat", quiz: "Quiz", clearChat: "Clear chat", askPlaceholder: "Ask a math question...",
      disclaimer: "MathMaxx can make mistakes. Verify important calculations.", today: "today", tryAsking: "Try asking:",
      mathQuiz: "Math Quiz", quizSub: "Generate a custom math quiz on any topic", mathTopic: "Math Topic",
      topicPlaceholder: "e.g. Quadratic equations, Trigonometry, Integrals...", schoolLevel: "School Level",
      middleSchool: "Middle School", middleSchoolDesc: "Grades 7–10", highSchool: "High School", highSchoolDesc: "Grades 11–13",
      university: "University", universityDesc: "College & up", questions: "Questions", generateQuiz: "Generate Quiz",
      quizzesToday: "quizzes today", creatingQuiz: "Creating your quiz...", generating: "Generating", questionsOn: "questions on",
      submitAnswers: "Submit Answers", reviewMistakes: "Review Mistakes with AI", newQuiz: "New Quiz", retryQuiz: "Retry Quiz",
      solution: "Solution", perfectScore: "Perfect score!", greatJob: "Great job!", goodEffort: "Good effort! Keep practicing.",
      keepStudying: "Keep studying, you will get there!", premiumTitle: "Upgrade to Premium",
      premiumDesc: "You have used your free messages. Upgrade for unlimited access to MathMaxx!",
      upgrade: "Upgrade to Premium", goBack: "Go back",
      dailyLimitChat: `You have reached your daily limit of ${DAILY_LIMITS.chatMessages} messages. Come back tomorrow!`,
      dailyLimitQuiz: `You have reached your daily limit of ${DAILY_LIMITS.quizzes} quizzes. Come back tomorrow!`,
      quizContext: "I remember your quiz. Ask me about any of the questions!", helpUnderstand: "Help me understand",
      exPrompt1: "Solve x² + 5x + 6 = 0", exPrompt2: "Explain how derivatives work", exPrompt3: "What is the Pythagorean theorem?",
      feat1: "Step-by-step problem solving", feat2: "Interactive math quizzes", feat3: "Any topic from algebra to calculus",
      feat4: "Adapted to your school level", yourLevel: "Your level", aiTutor: "AI Math Tutor", errorMsg: "Sorry, something went wrong. Please try again.",
      // Quick topic labels
      fractions: "Fractions", percentages: "Percentages", geometry: "Geometry", equations: "Equations", statistics: "Statistics",
      exponents: "Exponents", calculus: "Calculus", linearAlgebra: "Linear Algebra", diffEq: "Diff. Equations",
      series: "Series", discreteMath: "Discrete Math", algebra: "Algebra", trigonometry: "Trigonometry", functions: "Functions",
    },
    no: {
      welcome: "Velkommen til MathMaxx", welcomeSub: "Din AI-mattelærer. Spør meg om hva som helst innen matte, og jeg forklarer det steg for steg.",
      chat: "Chat", quiz: "Quiz", clearChat: "Tøm chat", askPlaceholder: "Still et mattespørsmål...",
      disclaimer: "MathMaxx kan gjøre feil. Verifiser viktige beregninger.", today: "i dag", tryAsking: "Prøv å spørre:",
      mathQuiz: "Mattequiz", quizSub: "Generer en tilpasset mattequiz om et hvilket som helst emne", mathTopic: "Matteemne",
      topicPlaceholder: "f.eks. Andregradslikninger, Trigonometri, Integraler...", schoolLevel: "Skolenivå",
      middleSchool: "Ungdomsskole", middleSchoolDesc: "8.–10. klasse", highSchool: "Videregående", highSchoolDesc: "VG1–VG3",
      university: "Universitet", universityDesc: "Høyere utdanning", questions: "Spørsmål", generateQuiz: "Generer quiz",
      quizzesToday: "quizer i dag", creatingQuiz: "Lager quizen din...", generating: "Genererer", questionsOn: "spørsmål om",
      submitAnswers: "Send inn svar", reviewMistakes: "Gjennomgå feil med AI", newQuiz: "Ny quiz", retryQuiz: "Prøv igjen",
      solution: "Løsning", perfectScore: "Full pott!", greatJob: "Flott jobbet!", goodEffort: "Bra innsats! Fortsett å øve.",
      keepStudying: "Fortsett å øve, du klarer det!", premiumTitle: "Oppgrader til Premium",
      premiumDesc: "Du har brukt opp dine gratis meldinger. Oppgrader for ubegrenset tilgang til MathMaxx!",
      upgrade: "Oppgrader til Premium", goBack: "Gå tilbake",
      dailyLimitChat: `Du har nådd daglig grense på ${DAILY_LIMITS.chatMessages} meldinger. Kom tilbake i morgen!`,
      dailyLimitQuiz: `Du har nådd daglig grense på ${DAILY_LIMITS.quizzes} quizer. Kom tilbake i morgen!`,
      quizContext: "Jeg husker quizen din. Spør meg om noen av spørsmålene!", helpUnderstand: "Hjelp meg å forstå",
      exPrompt1: "Løs x² + 5x + 6 = 0", exPrompt2: "Forklar hvordan derivasjon fungerer", exPrompt3: "Hva er Pytagoras' setning?",
      feat1: "Steg-for-steg problemløsning", feat2: "Interaktive mattequizer", feat3: "Alle emner fra algebra til kalkulus",
      feat4: "Tilpasset ditt skolenivå", yourLevel: "Ditt nivå", aiTutor: "AI Mattelærer", errorMsg: "Beklager, noe gikk galt. Prøv igjen.",
      fractions: "Brøk", percentages: "Prosent", geometry: "Geometri", equations: "Likninger", statistics: "Statistikk",
      exponents: "Potenser", calculus: "Kalkulus", linearAlgebra: "Lineær algebra", diffEq: "Diff.likninger",
      series: "Rekker", discreteMath: "Diskret matte", algebra: "Algebra", trigonometry: "Trigonometri", functions: "Funksjoner",
    },
    sv: {
      welcome: "Välkommen till MathMaxx", welcomeSub: "Din AI-mattelärare. Fråga mig vad som helst om matte så förklarar jag steg för steg.",
      chat: "Chatt", quiz: "Quiz", clearChat: "Rensa chatt", askPlaceholder: "Ställ en mattefråga...",
      disclaimer: "MathMaxx kan göra misstag. Verifiera viktiga beräkningar.", today: "idag", tryAsking: "Prova att fråga:",
      mathQuiz: "Mattequiz", quizSub: "Generera ett anpassat mattequiz om valfritt ämne", mathTopic: "Matteämne",
      topicPlaceholder: "t.ex. Andragradsekvationer, Trigonometri, Integraler...", schoolLevel: "Skolnivå",
      middleSchool: "Högstadiet", middleSchoolDesc: "Åk 7–9", highSchool: "Gymnasiet", highSchoolDesc: "Åk 1–3",
      university: "Universitet", universityDesc: "Högre utbildning", questions: "Frågor", generateQuiz: "Generera quiz",
      quizzesToday: "quiz idag", creatingQuiz: "Skapar ditt quiz...", generating: "Genererar", questionsOn: "frågor om",
      submitAnswers: "Skicka svar", reviewMistakes: "Granska fel med AI", newQuiz: "Nytt quiz", retryQuiz: "Försök igen",
      solution: "Lösning", perfectScore: "Full pott!", greatJob: "Bra jobbat!", goodEffort: "Bra insats! Fortsätt öva.",
      keepStudying: "Fortsätt plugga, du klarar det!", premiumTitle: "Uppgradera till Premium",
      premiumDesc: "Du har använt dina gratismeddelanden. Uppgradera för obegränsad tillgång!",
      upgrade: "Uppgradera till Premium", goBack: "Gå tillbaka",
      dailyLimitChat: `Du har nått dagsgränsen på ${DAILY_LIMITS.chatMessages} meddelanden. Kom tillbaka imorgon!`,
      dailyLimitQuiz: `Du har nått dagsgränsen på ${DAILY_LIMITS.quizzes} quiz. Kom tillbaka imorgon!`,
      quizContext: "Jag kommer ihåg ditt quiz. Fråga mig om frågorna!", helpUnderstand: "Hjälp mig förstå",
      exPrompt1: "Lös x² + 5x + 6 = 0", exPrompt2: "Förklara hur derivata fungerar", exPrompt3: "Vad är Pythagoras sats?",
      feat1: "Steg-för-steg problemlösning", feat2: "Interaktiva mattequiz", feat3: "Alla ämnen från algebra till kalkyl",
      feat4: "Anpassat till din skolnivå", yourLevel: "Din nivå", aiTutor: "AI Mattelärare", errorMsg: "Något gick fel. Försök igen.",
      fractions: "Bråk", percentages: "Procent", geometry: "Geometri", equations: "Ekvationer", statistics: "Statistik",
      exponents: "Potenser", calculus: "Kalkyl", linearAlgebra: "Linjär algebra", diffEq: "Diff.ekvationer",
      series: "Serier", discreteMath: "Diskret matte", algebra: "Algebra", trigonometry: "Trigonometri", functions: "Funktioner",
    },
    da: {
      welcome: "Velkommen til MathMaxx", welcomeSub: "Din AI-matematiklærer. Spørg mig om hvad som helst inden for matematik.",
      chat: "Chat", quiz: "Quiz", clearChat: "Ryd chat", askPlaceholder: "Stil et matematikspørgsmål...",
      disclaimer: "MathMaxx kan lave fejl. Verificer vigtige beregninger.", today: "i dag", tryAsking: "Prøv at spørge:",
      mathQuiz: "Matematikquiz", quizSub: "Generer en quiz om et matematikemne", mathTopic: "Matematikemne",
      topicPlaceholder: "f.eks. Andengradsligninger, Trigonometri, Integraler...", schoolLevel: "Skoleniveau",
      middleSchool: "Folkeskole", middleSchoolDesc: "7.–10. klasse", highSchool: "Gymnasium", highSchoolDesc: "1.–3.g",
      university: "Universitet", universityDesc: "Videregående", questions: "Spørgsmål", generateQuiz: "Generer quiz",
      quizzesToday: "quiz i dag", creatingQuiz: "Opretter din quiz...", generating: "Genererer", questionsOn: "spørgsmål om",
      submitAnswers: "Indsend svar", reviewMistakes: "Gennemgå fejl med AI", newQuiz: "Ny quiz", retryQuiz: "Prøv igen",
      solution: "Løsning", perfectScore: "Fuld potte!", greatJob: "Godt klaret!", goodEffort: "God indsats! Bliv ved med at øve.",
      keepStudying: "Bliv ved med at øve!", premiumTitle: "Opgrader til Premium",
      premiumDesc: "Du har brugt dine gratis beskeder. Opgrader for ubegrænset adgang!",
      upgrade: "Opgrader til Premium", goBack: "Gå tilbage",
      dailyLimitChat: `Du har nået din daglige grænse på ${DAILY_LIMITS.chatMessages} beskeder.`,
      dailyLimitQuiz: `Du har nået din daglige grænse på ${DAILY_LIMITS.quizzes} quiz.`,
      quizContext: "Jeg husker din quiz. Spørg mig om spørgsmålene!", helpUnderstand: "Hjælp mig med at forstå",
      exPrompt1: "Løs x² + 5x + 6 = 0", exPrompt2: "Forklar hvordan differentialregning virker", exPrompt3: "Hvad er Pythagoras' sætning?",
      feat1: "Trin-for-trin problemløsning", feat2: "Interaktive matematikquizzer", feat3: "Alle emner fra algebra til kalkulus",
      feat4: "Tilpasset dit skoleniveau", yourLevel: "Dit niveau", aiTutor: "AI Matematiklærer", errorMsg: "Noget gik galt. Prøv igen.",
      fractions: "Brøk", percentages: "Procent", geometry: "Geometri", equations: "Ligninger", statistics: "Statistik",
      exponents: "Potenser", calculus: "Kalkulus", linearAlgebra: "Lineær algebra", diffEq: "Diff.ligninger",
      series: "Rækker", discreteMath: "Diskret mat.", algebra: "Algebra", trigonometry: "Trigonometri", functions: "Funktioner",
    },
    fi: {
      welcome: "Tervetuloa MathMaxxiin", welcomeSub: "AI-matematiikkaopettajasi. Kysy mitä tahansa matematiikasta.",
      chat: "Chat", quiz: "Tietovisa", clearChat: "Tyhjennä", askPlaceholder: "Kysy matematiikkakysymys...",
      disclaimer: "MathMaxx voi tehdä virheitä. Tarkista tärkeät laskut.", today: "tänään", tryAsking: "Kokeile kysyä:",
      mathQuiz: "Matikkatietovisa", quizSub: "Luo tietovisa mistä tahansa aiheesta", mathTopic: "Matikka-aihe",
      topicPlaceholder: "esim. Toisen asteen yhtälöt, Trigonometria...", schoolLevel: "Koulutaso",
      middleSchool: "Yläkoulu", middleSchoolDesc: "Luokat 7–9", highSchool: "Lukio", highSchoolDesc: "Luokat 1–3",
      university: "Yliopisto", universityDesc: "Korkeakoulu", questions: "Kysymystä", generateQuiz: "Luo tietovisa",
      quizzesToday: "tietovisaa tänään", creatingQuiz: "Luodaan tietovisaa...", generating: "Luodaan", questionsOn: "kysymystä aiheesta",
      submitAnswers: "Lähetä vastaukset", reviewMistakes: "Käy virheet läpi", newQuiz: "Uusi tietovisa", retryQuiz: "Yritä uudelleen",
      solution: "Ratkaisu", perfectScore: "Täydet pisteet!", greatJob: "Hienoa!", goodEffort: "Hyvä yritys! Jatka harjoittelua.",
      keepStudying: "Jatka opiskelua!", premiumTitle: "Päivitä Premiumiin",
      premiumDesc: "Olet käyttänyt ilmaiset viestit. Päivitä rajoittamatonta käyttöä varten!",
      upgrade: "Päivitä Premiumiin", goBack: "Takaisin",
      dailyLimitChat: `Olet saavuttanut päivittäisen rajan (${DAILY_LIMITS.chatMessages} viestiä).`,
      dailyLimitQuiz: `Olet saavuttanut päivittäisen rajan (${DAILY_LIMITS.quizzes} tietovisaa).`,
      quizContext: "Muistan tietovisasi. Kysy kysymyksistä!", helpUnderstand: "Auta ymmärtämään",
      exPrompt1: "Ratkaise x² + 5x + 6 = 0", exPrompt2: "Selitä miten derivaatta toimii", exPrompt3: "Mikä on Pythagoraan lause?",
      feat1: "Vaiheittainen ongelmanratkaisu", feat2: "Interaktiiviset tietovisat", feat3: "Kaikki aiheet algebrasta analyysiin",
      feat4: "Sopeutettu koulutasoosi", yourLevel: "Tasosi", aiTutor: "AI Matikkaopettaja", errorMsg: "Jokin meni pieleen. Yritä uudelleen.",
      fractions: "Murtoluvut", percentages: "Prosentit", geometry: "Geometria", equations: "Yhtälöt", statistics: "Tilastotiede",
      exponents: "Potenssit", calculus: "Analyysi", linearAlgebra: "Lineaarialgebra", diffEq: "Diff.yhtälöt",
      series: "Sarjat", discreteMath: "Diskr. mat.", algebra: "Algebra", trigonometry: "Trigonometria", functions: "Funktiot",
    },
    de: {
      welcome: "Willkommen bei MathMaxx", welcomeSub: "Dein KI-Mathelehrer. Frag mich alles über Mathe – ich erkläre es Schritt für Schritt.",
      chat: "Chat", quiz: "Quiz", clearChat: "Chat löschen", askPlaceholder: "Stelle eine Mathefrage...",
      disclaimer: "MathMaxx kann Fehler machen. Überprüfe wichtige Berechnungen.", today: "heute", tryAsking: "Probier zu fragen:",
      mathQuiz: "Mathequiz", quizSub: "Erstelle ein Quiz zu jedem Mathe-Thema", mathTopic: "Mathe-Thema",
      topicPlaceholder: "z.B. Quadratische Gleichungen, Trigonometrie, Integrale...", schoolLevel: "Schulstufe",
      middleSchool: "Mittelstufe", middleSchoolDesc: "Klasse 7–10", highSchool: "Oberstufe", highSchoolDesc: "Klasse 11–13",
      university: "Universität", universityDesc: "Hochschule", questions: "Fragen", generateQuiz: "Quiz erstellen",
      quizzesToday: "Quiz heute", creatingQuiz: "Erstelle dein Quiz...", generating: "Erstelle", questionsOn: "Fragen zu",
      submitAnswers: "Antworten einreichen", reviewMistakes: "Fehler mit KI prüfen", newQuiz: "Neues Quiz", retryQuiz: "Nochmal",
      solution: "Lösung", perfectScore: "Volle Punktzahl!", greatJob: "Super gemacht!", goodEffort: "Guter Einsatz! Übe weiter.",
      keepStudying: "Übe weiter, du schaffst das!", premiumTitle: "Auf Premium upgraden",
      premiumDesc: "Du hast deine kostenlosen Nachrichten aufgebraucht. Upgrade für unbegrenzten Zugang!",
      upgrade: "Auf Premium upgraden", goBack: "Zurück",
      dailyLimitChat: `Du hast dein Tageslimit von ${DAILY_LIMITS.chatMessages} Nachrichten erreicht.`,
      dailyLimitQuiz: `Du hast dein Tageslimit von ${DAILY_LIMITS.quizzes} Quiz erreicht.`,
      quizContext: "Ich erinnere mich an dein Quiz. Frag mich zu den Fragen!", helpUnderstand: "Hilf mir verstehen",
      exPrompt1: "Löse x² + 5x + 6 = 0", exPrompt2: "Erkläre wie Ableitungen funktionieren", exPrompt3: "Was ist der Satz des Pythagoras?",
      feat1: "Schritt-für-Schritt Lösungen", feat2: "Interaktive Mathe-Quiz", feat3: "Alle Themen von Algebra bis Analysis",
      feat4: "Angepasst an dein Schulniveau", yourLevel: "Dein Level", aiTutor: "KI Mathelehrer", errorMsg: "Etwas ist schiefgelaufen. Versuch es nochmal.",
      fractions: "Brüche", percentages: "Prozent", geometry: "Geometrie", equations: "Gleichungen", statistics: "Statistik",
      exponents: "Potenzen", calculus: "Analysis", linearAlgebra: "Lineare Algebra", diffEq: "Diff.gleichungen",
      series: "Reihen", discreteMath: "Diskrete Math.", algebra: "Algebra", trigonometry: "Trigonometrie", functions: "Funktionen",
    },
    fr: {
      welcome: "Bienvenue sur MathMaxx", welcomeSub: "Ton tuteur IA en maths. Pose-moi n'importe quelle question et je t'expliquerai étape par étape.",
      chat: "Chat", quiz: "Quiz", clearChat: "Effacer le chat", askPlaceholder: "Pose une question de maths...",
      disclaimer: "MathMaxx peut faire des erreurs. Vérifie les calculs importants.", today: "aujourd'hui", tryAsking: "Essaie de demander :",
      mathQuiz: "Quiz de maths", quizSub: "Génère un quiz sur n'importe quel sujet", mathTopic: "Sujet de maths",
      topicPlaceholder: "ex. Équations du 2nd degré, Trigonométrie, Intégrales...", schoolLevel: "Niveau scolaire",
      middleSchool: "Collège", middleSchoolDesc: "6e–3e", highSchool: "Lycée", highSchoolDesc: "2nde–Terminale",
      university: "Université", universityDesc: "Études supérieures", questions: "Questions", generateQuiz: "Générer le quiz",
      quizzesToday: "quiz aujourd'hui", creatingQuiz: "Création de ton quiz...", generating: "Génération", questionsOn: "questions sur",
      submitAnswers: "Soumettre les réponses", reviewMistakes: "Revoir les erreurs avec l'IA", newQuiz: "Nouveau quiz", retryQuiz: "Réessayer",
      solution: "Solution", perfectScore: "Score parfait !", greatJob: "Bravo !", goodEffort: "Bon effort ! Continue à t'entraîner.",
      keepStudying: "Continue à étudier, tu vas y arriver !", premiumTitle: "Passer à Premium",
      premiumDesc: "Tu as utilisé tes messages gratuits. Passe à Premium pour un accès illimité !",
      upgrade: "Passer à Premium", goBack: "Retour",
      dailyLimitChat: `Tu as atteint ta limite quotidienne de ${DAILY_LIMITS.chatMessages} messages.`,
      dailyLimitQuiz: `Tu as atteint ta limite quotidienne de ${DAILY_LIMITS.quizzes} quiz.`,
      quizContext: "Je me souviens de ton quiz. Pose-moi des questions !", helpUnderstand: "Aide-moi à comprendre",
      exPrompt1: "Résous x² + 5x + 6 = 0", exPrompt2: "Explique comment fonctionnent les dérivées", exPrompt3: "Qu'est-ce que le théorème de Pythagore ?",
      feat1: "Résolution étape par étape", feat2: "Quiz de maths interactifs", feat3: "Tous les sujets de l'algèbre au calcul",
      feat4: "Adapté à ton niveau scolaire", yourLevel: "Ton niveau", aiTutor: "Tuteur IA Maths", errorMsg: "Une erreur est survenue. Réessaie.",
      fractions: "Fractions", percentages: "Pourcentages", geometry: "Géométrie", equations: "Équations", statistics: "Statistiques",
      exponents: "Puissances", calculus: "Calcul", linearAlgebra: "Algèbre linéaire", diffEq: "Éq. diff.",
      series: "Séries", discreteMath: "Maths discrètes", algebra: "Algèbre", trigonometry: "Trigonométrie", functions: "Fonctions",
    },
    es: {
      welcome: "Bienvenido a MathMaxx", welcomeSub: "Tu tutor IA de matemáticas. Pregúntame lo que quieras y te lo explico paso a paso.",
      chat: "Chat", quiz: "Quiz", clearChat: "Borrar chat", askPlaceholder: "Haz una pregunta de mates...",
      disclaimer: "MathMaxx puede cometer errores. Verifica cálculos importantes.", today: "hoy", tryAsking: "Intenta preguntar:",
      mathQuiz: "Quiz de mates", quizSub: "Genera un quiz sobre cualquier tema", mathTopic: "Tema de mates",
      topicPlaceholder: "ej. Ecuaciones cuadráticas, Trigonometría, Integrales...", schoolLevel: "Nivel escolar",
      middleSchool: "Secundaria", middleSchoolDesc: "1º–4º ESO", highSchool: "Bachillerato", highSchoolDesc: "1º–2º Bach.",
      university: "Universidad", universityDesc: "Estudios superiores", questions: "Preguntas", generateQuiz: "Generar quiz",
      quizzesToday: "quiz hoy", creatingQuiz: "Creando tu quiz...", generating: "Generando", questionsOn: "preguntas sobre",
      submitAnswers: "Enviar respuestas", reviewMistakes: "Repasar errores con IA", newQuiz: "Nuevo quiz", retryQuiz: "Reintentar",
      solution: "Solución", perfectScore: "¡Puntuación perfecta!", greatJob: "¡Buen trabajo!", goodEffort: "¡Buen esfuerzo! Sigue practicando.",
      keepStudying: "¡Sigue estudiando, lo conseguirás!", premiumTitle: "Mejora a Premium",
      premiumDesc: "Has usado tus mensajes gratuitos. ¡Mejora para acceso ilimitado!",
      upgrade: "Mejora a Premium", goBack: "Volver",
      dailyLimitChat: `Has alcanzado tu límite diario de ${DAILY_LIMITS.chatMessages} mensajes.`,
      dailyLimitQuiz: `Has alcanzado tu límite diario de ${DAILY_LIMITS.quizzes} quiz.`,
      quizContext: "Recuerdo tu quiz. ¡Pregúntame sobre las preguntas!", helpUnderstand: "Ayúdame a entender",
      exPrompt1: "Resuelve x² + 5x + 6 = 0", exPrompt2: "Explica cómo funcionan las derivadas", exPrompt3: "¿Qué es el teorema de Pitágoras?",
      feat1: "Resolución paso a paso", feat2: "Quiz de mates interactivos", feat3: "Cualquier tema de álgebra a cálculo",
      feat4: "Adaptado a tu nivel escolar", yourLevel: "Tu nivel", aiTutor: "Tutor IA Mates", errorMsg: "Algo salió mal. Inténtalo de nuevo.",
      fractions: "Fracciones", percentages: "Porcentajes", geometry: "Geometría", equations: "Ecuaciones", statistics: "Estadística",
      exponents: "Potencias", calculus: "Cálculo", linearAlgebra: "Álgebra lineal", diffEq: "Ec. diferenciales",
      series: "Series", discreteMath: "Mate discreta", algebra: "Álgebra", trigonometry: "Trigonometría", functions: "Funciones",
    },
    pt: {
      welcome: "Bem-vindo ao MathMaxx", welcomeSub: "Seu tutor IA de matemática. Pergunte qualquer coisa e eu explico passo a passo.",
      chat: "Chat", quiz: "Quiz", clearChat: "Limpar chat", askPlaceholder: "Faça uma pergunta de matemática...",
      disclaimer: "MathMaxx pode errar. Verifique cálculos importantes.", today: "hoje", tryAsking: "Tente perguntar:",
      mathQuiz: "Quiz de matemática", quizSub: "Gere um quiz sobre qualquer tema", mathTopic: "Tema de matemática",
      topicPlaceholder: "ex. Equações quadráticas, Trigonometria, Integrais...", schoolLevel: "Nível escolar",
      middleSchool: "Ensino Fundamental", middleSchoolDesc: "7º–9º ano", highSchool: "Ensino Médio", highSchoolDesc: "1º–3º ano",
      university: "Universidade", universityDesc: "Ensino superior", questions: "Perguntas", generateQuiz: "Gerar quiz",
      quizzesToday: "quiz hoje", creatingQuiz: "Criando seu quiz...", generating: "Gerando", questionsOn: "perguntas sobre",
      submitAnswers: "Enviar respostas", reviewMistakes: "Revisar erros com IA", newQuiz: "Novo quiz", retryQuiz: "Tentar novamente",
      solution: "Solução", perfectScore: "Nota perfeita!", greatJob: "Bom trabalho!", goodEffort: "Bom esforço! Continue praticando.",
      keepStudying: "Continue estudando!", premiumTitle: "Atualizar para Premium",
      premiumDesc: "Você usou suas mensagens grátis. Atualize para acesso ilimitado!",
      upgrade: "Atualizar para Premium", goBack: "Voltar",
      dailyLimitChat: `Você atingiu o limite diário de ${DAILY_LIMITS.chatMessages} mensagens.`,
      dailyLimitQuiz: `Você atingiu o limite diário de ${DAILY_LIMITS.quizzes} quiz.`,
      quizContext: "Lembro do seu quiz. Pergunte sobre as questões!", helpUnderstand: "Me ajude a entender",
      exPrompt1: "Resolva x² + 5x + 6 = 0", exPrompt2: "Explique como derivadas funcionam", exPrompt3: "O que é o teorema de Pitágoras?",
      feat1: "Resolução passo a passo", feat2: "Quiz interativos", feat3: "Qualquer tema de álgebra a cálculo",
      feat4: "Adaptado ao seu nível", yourLevel: "Seu nível", aiTutor: "Tutor IA Matemática", errorMsg: "Algo deu errado. Tente novamente.",
      fractions: "Frações", percentages: "Porcentagens", geometry: "Geometria", equations: "Equações", statistics: "Estatística",
      exponents: "Potências", calculus: "Cálculo", linearAlgebra: "Álgebra linear", diffEq: "Eq. diferenciais",
      series: "Séries", discreteMath: "Mate discreta", algebra: "Álgebra", trigonometry: "Trigonometria", functions: "Funções",
    },
    it: {
      welcome: "Benvenuto su MathMaxx", welcomeSub: "Il tuo tutor IA di matematica. Chiedimi qualsiasi cosa e te la spiego passo dopo passo.",
      chat: "Chat", quiz: "Quiz", clearChat: "Cancella chat", askPlaceholder: "Fai una domanda di matematica...",
      disclaimer: "MathMaxx può sbagliare. Verifica i calcoli importanti.", today: "oggi", tryAsking: "Prova a chiedere:",
      mathQuiz: "Quiz di matematica", quizSub: "Genera un quiz su qualsiasi argomento", mathTopic: "Argomento",
      topicPlaceholder: "es. Equazioni di 2° grado, Trigonometria, Integrali...", schoolLevel: "Livello scolastico",
      middleSchool: "Medie", middleSchoolDesc: "1ª–3ª media", highSchool: "Superiori", highSchoolDesc: "1°–5° superiore",
      university: "Università", universityDesc: "Studi superiori", questions: "Domande", generateQuiz: "Genera quiz",
      quizzesToday: "quiz oggi", creatingQuiz: "Creo il tuo quiz...", generating: "Generazione", questionsOn: "domande su",
      submitAnswers: "Invia risposte", reviewMistakes: "Rivedi errori con IA", newQuiz: "Nuovo quiz", retryQuiz: "Riprova",
      solution: "Soluzione", perfectScore: "Punteggio perfetto!", greatJob: "Ottimo lavoro!", goodEffort: "Buon impegno! Continua ad esercitarti.",
      keepStudying: "Continua a studiare!", premiumTitle: "Passa a Premium",
      premiumDesc: "Hai esaurito i messaggi gratuiti. Passa a Premium per accesso illimitato!",
      upgrade: "Passa a Premium", goBack: "Indietro",
      dailyLimitChat: `Hai raggiunto il limite giornaliero di ${DAILY_LIMITS.chatMessages} messaggi.`,
      dailyLimitQuiz: `Hai raggiunto il limite giornaliero di ${DAILY_LIMITS.quizzes} quiz.`,
      quizContext: "Ricordo il tuo quiz. Chiedimi delle domande!", helpUnderstand: "Aiutami a capire",
      exPrompt1: "Risolvi x² + 5x + 6 = 0", exPrompt2: "Spiega come funzionano le derivate", exPrompt3: "Cos'è il teorema di Pitagora?",
      feat1: "Risoluzione passo dopo passo", feat2: "Quiz interattivi", feat3: "Qualsiasi argomento dall'algebra al calcolo",
      feat4: "Adattato al tuo livello", yourLevel: "Il tuo livello", aiTutor: "Tutor IA Matematica", errorMsg: "Qualcosa è andato storto. Riprova.",
      fractions: "Frazioni", percentages: "Percentuali", geometry: "Geometria", equations: "Equazioni", statistics: "Statistica",
      exponents: "Potenze", calculus: "Analisi", linearAlgebra: "Algebra lineare", diffEq: "Eq. differenziali",
      series: "Serie", discreteMath: "Mat. discreta", algebra: "Algebra", trigonometry: "Trigonometria", functions: "Funzioni",
    },
    nl: {
      welcome: "Welkom bij MathMaxx", welcomeSub: "Je AI-wiskundeleraar. Vraag me alles over wiskunde.",
      chat: "Chat", quiz: "Quiz", clearChat: "Chat wissen", askPlaceholder: "Stel een wiskundevraag...",
      disclaimer: "MathMaxx kan fouten maken. Controleer belangrijke berekeningen.", today: "vandaag", tryAsking: "Probeer te vragen:",
      mathQuiz: "Wiskundequiz", quizSub: "Maak een quiz over elk onderwerp", mathTopic: "Wiskunde-onderwerp",
      topicPlaceholder: "bijv. Kwadratische vergelijkingen, Trigonometrie...", schoolLevel: "Schoolniveau",
      middleSchool: "Onderbouw", middleSchoolDesc: "Klas 1–3", highSchool: "Bovenbouw", highSchoolDesc: "Klas 4–6",
      university: "Universiteit", universityDesc: "Hoger onderwijs", questions: "Vragen", generateQuiz: "Quiz genereren",
      quizzesToday: "quiz vandaag", creatingQuiz: "Quiz wordt gemaakt...", generating: "Genereren", questionsOn: "vragen over",
      submitAnswers: "Antwoorden insturen", reviewMistakes: "Fouten bekijken met AI", newQuiz: "Nieuwe quiz", retryQuiz: "Opnieuw",
      solution: "Oplossing", perfectScore: "Perfecte score!", greatJob: "Goed gedaan!", goodEffort: "Goed geprobeerd! Blijf oefenen.",
      keepStudying: "Blijf studeren!", premiumTitle: "Upgrade naar Premium",
      premiumDesc: "Je gratis berichten zijn op. Upgrade voor onbeperkte toegang!",
      upgrade: "Upgrade naar Premium", goBack: "Terug",
      dailyLimitChat: `Je hebt je dagelijkse limiet van ${DAILY_LIMITS.chatMessages} berichten bereikt.`,
      dailyLimitQuiz: `Je hebt je dagelijkse limiet van ${DAILY_LIMITS.quizzes} quiz bereikt.`,
      quizContext: "Ik herinner je quiz. Vraag me over de vragen!", helpUnderstand: "Help me begrijpen",
      exPrompt1: "Los x² + 5x + 6 = 0 op", exPrompt2: "Leg uit hoe afgeleiden werken", exPrompt3: "Wat is de stelling van Pythagoras?",
      feat1: "Stapsgewijze oplossingen", feat2: "Interactieve wiskundequiz", feat3: "Elk onderwerp van algebra tot calculus",
      feat4: "Aangepast aan je schoolniveau", yourLevel: "Je niveau", aiTutor: "AI Wiskundeleraar", errorMsg: "Er ging iets mis. Probeer opnieuw.",
      fractions: "Breuken", percentages: "Procenten", geometry: "Meetkunde", equations: "Vergelijkingen", statistics: "Statistiek",
      exponents: "Machten", calculus: "Calculus", linearAlgebra: "Lineaire algebra", diffEq: "Diff.vergelijkingen",
      series: "Reeksen", discreteMath: "Discrete wisk.", algebra: "Algebra", trigonometry: "Goniometrie", functions: "Functies",
    },
    pl: {
      welcome: "Witaj w MathMaxx", welcomeSub: "Twój nauczyciel AI matematyki. Zapytaj mnie o cokolwiek.",
      chat: "Czat", quiz: "Quiz", clearChat: "Wyczyść czat", askPlaceholder: "Zadaj pytanie z matematyki...",
      disclaimer: "MathMaxx może popełniać błędy. Weryfikuj ważne obliczenia.", today: "dziś", tryAsking: "Spróbuj zapytać:",
      mathQuiz: "Quiz z matematyki", quizSub: "Wygeneruj quiz na dowolny temat", mathTopic: "Temat",
      topicPlaceholder: "np. Równania kwadratowe, Trygonometria, Całki...", schoolLevel: "Poziom",
      middleSchool: "Gimnazjum", middleSchoolDesc: "Kl. 7–8", highSchool: "Liceum", highSchoolDesc: "Kl. 1–4",
      university: "Uniwersytet", universityDesc: "Studia wyższe", questions: "Pytania", generateQuiz: "Generuj quiz",
      quizzesToday: "quizów dziś", creatingQuiz: "Tworzenie quizu...", generating: "Generowanie", questionsOn: "pytań o",
      submitAnswers: "Wyślij odpowiedzi", reviewMistakes: "Przejrzyj błędy z AI", newQuiz: "Nowy quiz", retryQuiz: "Spróbuj ponownie",
      solution: "Rozwiązanie", perfectScore: "Perfekcyjny wynik!", greatJob: "Świetna robota!", goodEffort: "Dobry wysiłek! Ćwicz dalej.",
      keepStudying: "Ucz się dalej!", premiumTitle: "Przejdź na Premium",
      premiumDesc: "Wykorzystałeś darmowe wiadomości. Przejdź na Premium!",
      upgrade: "Przejdź na Premium", goBack: "Wróć",
      dailyLimitChat: `Osiągnąłeś limit ${DAILY_LIMITS.chatMessages} wiadomości dziennie.`,
      dailyLimitQuiz: `Osiągnąłeś limit ${DAILY_LIMITS.quizzes} quizów dziennie.`,
      quizContext: "Pamiętam twój quiz. Pytaj mnie o pytania!", helpUnderstand: "Pomóż mi zrozumieć",
      exPrompt1: "Rozwiąż x² + 5x + 6 = 0", exPrompt2: "Wyjaśnij jak działają pochodne", exPrompt3: "Co to jest twierdzenie Pitagorasa?",
      feat1: "Rozwiązania krok po kroku", feat2: "Interaktywne quizy", feat3: "Każdy temat od algebry po rachunek",
      feat4: "Dostosowane do Twojego poziomu", yourLevel: "Twój poziom", aiTutor: "AI Nauczyciel Matematyki", errorMsg: "Coś poszło nie tak. Spróbuj ponownie.",
      fractions: "Ułamki", percentages: "Procenty", geometry: "Geometria", equations: "Równania", statistics: "Statystyka",
      exponents: "Potęgi", calculus: "Rachunek", linearAlgebra: "Algebra liniowa", diffEq: "Równania różn.",
      series: "Szeregi", discreteMath: "Mat. dyskretna", algebra: "Algebra", trigonometry: "Trygonometria", functions: "Funkcje",
    },
    tr: {
      welcome: "MathMaxx'a Hoş Geldin", welcomeSub: "Yapay zeka matematik öğretmenin. Bana matematik hakkında her şeyi sorabilirsin.",
      chat: "Sohbet", quiz: "Quiz", clearChat: "Sohbeti temizle", askPlaceholder: "Bir matematik sorusu sor...",
      disclaimer: "MathMaxx hata yapabilir. Önemli hesaplamaları doğrula.", today: "bugün", tryAsking: "Şunu sormayı dene:",
      mathQuiz: "Matematik Quiz", quizSub: "Herhangi bir konuda quiz oluştur", mathTopic: "Matematik Konusu",
      topicPlaceholder: "ör. İkinci dereceden denklemler, Trigonometri...", schoolLevel: "Okul Seviyesi",
      middleSchool: "Ortaokul", middleSchoolDesc: "5–8. sınıf", highSchool: "Lise", highSchoolDesc: "9–12. sınıf",
      university: "Üniversite", universityDesc: "Yükseköğretim", questions: "Soru", generateQuiz: "Quiz Oluştur",
      quizzesToday: "quiz bugün", creatingQuiz: "Quizin oluşturuluyor...", generating: "Oluşturuluyor", questionsOn: "soru hakkında",
      submitAnswers: "Cevapları Gönder", reviewMistakes: "Hataları AI ile İncele", newQuiz: "Yeni Quiz", retryQuiz: "Tekrar Dene",
      solution: "Çözüm", perfectScore: "Tam puan!", greatJob: "Harika!", goodEffort: "İyi çaba! Pratik yapmaya devam et.",
      keepStudying: "Çalışmaya devam et!", premiumTitle: "Premium'a Yükselt",
      premiumDesc: "Ücretsiz mesajlarını kullandın. Sınırsız erişim için yükselt!",
      upgrade: "Premium'a Yükselt", goBack: "Geri dön",
      dailyLimitChat: `Günlük ${DAILY_LIMITS.chatMessages} mesaj sınırına ulaştın.`,
      dailyLimitQuiz: `Günlük ${DAILY_LIMITS.quizzes} quiz sınırına ulaştın.`,
      quizContext: "Quizini hatırlıyorum. Sorular hakkında sor!", helpUnderstand: "Anlamama yardım et",
      exPrompt1: "x² + 5x + 6 = 0 çöz", exPrompt2: "Türevlerin nasıl çalıştığını açıkla", exPrompt3: "Pisagor teoremi nedir?",
      feat1: "Adım adım çözüm", feat2: "İnteraktif quiz", feat3: "Cebirden analize her konu",
      feat4: "Seviyene uyarlanmış", yourLevel: "Seviyen", aiTutor: "AI Matematik Öğretmeni", errorMsg: "Bir hata oluştu. Tekrar dene.",
      fractions: "Kesirler", percentages: "Yüzdeler", geometry: "Geometri", equations: "Denklemler", statistics: "İstatistik",
      exponents: "Üsler", calculus: "Kalkülüs", linearAlgebra: "Lineer cebir", diffEq: "Diferansiyel denk.",
      series: "Seriler", discreteMath: "Ayrık mat.", algebra: "Cebir", trigonometry: "Trigonometri", functions: "Fonksiyonlar",
    },
    ru: {
      welcome: "Добро пожаловать в MathMaxx", welcomeSub: "Твой ИИ-репетитор по математике. Спроси меня что угодно — объясню пошагово.",
      chat: "Чат", quiz: "Тест", clearChat: "Очистить чат", askPlaceholder: "Задай вопрос по математике...",
      disclaimer: "MathMaxx может ошибаться. Проверяй важные вычисления.", today: "сегодня", tryAsking: "Попробуй спросить:",
      mathQuiz: "Тест по математике", quizSub: "Создай тест на любую тему", mathTopic: "Тема",
      topicPlaceholder: "напр. Квадратные уравнения, Тригонометрия, Интегралы...", schoolLevel: "Уровень",
      middleSchool: "Средняя школа", middleSchoolDesc: "7–9 класс", highSchool: "Старшая школа", highSchoolDesc: "10–11 класс",
      university: "Университет", universityDesc: "Высшее образование", questions: "Вопросов", generateQuiz: "Создать тест",
      quizzesToday: "тестов сегодня", creatingQuiz: "Создаю тест...", generating: "Создание", questionsOn: "вопросов по",
      submitAnswers: "Отправить ответы", reviewMistakes: "Разобрать ошибки с ИИ", newQuiz: "Новый тест", retryQuiz: "Попробовать снова",
      solution: "Решение", perfectScore: "Отлично!", greatJob: "Молодец!", goodEffort: "Хороший результат! Продолжай.",
      keepStudying: "Продолжай учиться!", premiumTitle: "Перейти на Premium",
      premiumDesc: "Бесплатные сообщения закончились. Перейди на Premium!",
      upgrade: "Перейти на Premium", goBack: "Назад",
      dailyLimitChat: `Ты достиг дневного лимита в ${DAILY_LIMITS.chatMessages} сообщений.`,
      dailyLimitQuiz: `Ты достиг дневного лимита в ${DAILY_LIMITS.quizzes} тестов.`,
      quizContext: "Я помню твой тест. Спрашивай!", helpUnderstand: "Помоги мне понять",
      exPrompt1: "Реши x² + 5x + 6 = 0", exPrompt2: "Объясни как работают производные", exPrompt3: "Что такое теорема Пифагора?",
      feat1: "Пошаговые решения", feat2: "Интерактивные тесты", feat3: "Любая тема от алгебры до анализа",
      feat4: "Адаптировано к твоему уровню", yourLevel: "Твой уровень", aiTutor: "ИИ Репетитор по Математике", errorMsg: "Что-то пошло не так. Попробуй ещё раз.",
      fractions: "Дроби", percentages: "Проценты", geometry: "Геометрия", equations: "Уравнения", statistics: "Статистика",
      exponents: "Степени", calculus: "Анализ", linearAlgebra: "Линейная алгебра", diffEq: "Дифф. уравнения",
      series: "Ряды", discreteMath: "Дискр. мат.", algebra: "Алгебра", trigonometry: "Тригонометрия", functions: "Функции",
    },
    uk: {
      welcome: "Ласкаво просимо до MathMaxx", welcomeSub: "Твій ШІ-репетитор з математики. Запитай мене будь-що.",
      chat: "Чат", quiz: "Тест", clearChat: "Очистити чат", askPlaceholder: "Задай питання з математики...",
      disclaimer: "MathMaxx може помилятися. Перевіряй важливі обчислення.", today: "сьогодні", tryAsking: "Спробуй запитати:",
      mathQuiz: "Тест з математики", quizSub: "Створи тест на будь-яку тему", mathTopic: "Тема",
      topicPlaceholder: "напр. Квадратні рівняння, Тригонометрія, Інтеграли...", schoolLevel: "Рівень",
      middleSchool: "Середня школа", middleSchoolDesc: "7–9 клас", highSchool: "Старша школа", highSchoolDesc: "10–11 клас",
      university: "Університет", universityDesc: "Вища освіта", questions: "Питань", generateQuiz: "Створити тест",
      quizzesToday: "тестів сьогодні", creatingQuiz: "Створюю тест...", generating: "Створення", questionsOn: "питань про",
      submitAnswers: "Надіслати відповіді", reviewMistakes: "Розібрати помилки", newQuiz: "Новий тест", retryQuiz: "Спробувати знову",
      solution: "Розв'язок", perfectScore: "Бездоганно!", greatJob: "Молодець!", goodEffort: "Гарний результат! Продовжуй.",
      keepStudying: "Продовжуй вчитися!", premiumTitle: "Перейти на Premium",
      premiumDesc: "Безкоштовні повідомлення закінчилися. Перейди на Premium!",
      upgrade: "Перейти на Premium", goBack: "Назад",
      dailyLimitChat: `Ти досяг денного ліміту в ${DAILY_LIMITS.chatMessages} повідомлень.`,
      dailyLimitQuiz: `Ти досяг денного ліміту в ${DAILY_LIMITS.quizzes} тестів.`,
      quizContext: "Я пам'ятаю твій тест. Запитуй!", helpUnderstand: "Допоможи мені зрозуміти",
      exPrompt1: "Розв'яжи x² + 5x + 6 = 0", exPrompt2: "Поясни як працюють похідні", exPrompt3: "Що таке теорема Піфагора?",
      feat1: "Покрокові розв'язки", feat2: "Інтерактивні тести", feat3: "Будь-яка тема від алгебри до аналізу",
      feat4: "Адаптовано до твого рівня", yourLevel: "Твій рівень", aiTutor: "ШІ Репетитор з Математики", errorMsg: "Щось пішло не так. Спробуй ще раз.",
      fractions: "Дроби", percentages: "Відсотки", geometry: "Геометрія", equations: "Рівняння", statistics: "Статистика",
      exponents: "Степені", calculus: "Аналіз", linearAlgebra: "Лінійна алгебра", diffEq: "Диф. рівняння",
      series: "Ряди", discreteMath: "Дискр. мат.", algebra: "Алгебра", trigonometry: "Тригонометрія", functions: "Функції",
    },
    ar: {
      welcome: "مرحبًا في MathMaxx", welcomeSub: "معلمك الذكي للرياضيات. اسألني أي شيء وسأشرحه خطوة بخطوة.",
      chat: "محادثة", quiz: "اختبار", clearChat: "مسح المحادثة", askPlaceholder: "اطرح سؤال رياضيات...",
      disclaimer: "MathMaxx قد يخطئ. تحقق من الحسابات المهمة.", today: "اليوم", tryAsking: "جرّب أن تسأل:",
      mathQuiz: "اختبار رياضيات", quizSub: "أنشئ اختبارًا عن أي موضوع", mathTopic: "الموضوع",
      topicPlaceholder: "مثل: المعادلات التربيعية، المثلثات، التكاملات...", schoolLevel: "المستوى",
      middleSchool: "متوسط", middleSchoolDesc: "صف 7-9", highSchool: "ثانوي", highSchoolDesc: "صف 10-12",
      university: "جامعة", universityDesc: "تعليم عالي", questions: "أسئلة", generateQuiz: "إنشاء اختبار",
      quizzesToday: "اختبار اليوم", creatingQuiz: "جارٍ إنشاء الاختبار...", generating: "جارٍ الإنشاء", questionsOn: "أسئلة عن",
      submitAnswers: "إرسال الإجابات", reviewMistakes: "مراجعة الأخطاء", newQuiz: "اختبار جديد", retryQuiz: "إعادة المحاولة",
      solution: "الحل", perfectScore: "نتيجة مثالية!", greatJob: "أحسنت!", goodEffort: "جهد جيد! واصل التدريب.",
      keepStudying: "واصل الدراسة!", premiumTitle: "ترقية إلى Premium",
      premiumDesc: "انتهت رسائلك المجانية. قم بالترقية للوصول غير المحدود!",
      upgrade: "ترقية إلى Premium", goBack: "رجوع",
      dailyLimitChat: `وصلت إلى الحد اليومي (${DAILY_LIMITS.chatMessages} رسالة).`,
      dailyLimitQuiz: `وصلت إلى الحد اليومي (${DAILY_LIMITS.quizzes} اختبار).`,
      quizContext: "أتذكر اختبارك. اسألني عن الأسئلة!", helpUnderstand: "ساعدني أفهم",
      exPrompt1: "حل x² + 5x + 6 = 0", exPrompt2: "اشرح كيف تعمل المشتقات", exPrompt3: "ما هي نظرية فيثاغورس؟",
      feat1: "حل خطوة بخطوة", feat2: "اختبارات تفاعلية", feat3: "أي موضوع من الجبر إلى التفاضل",
      feat4: "مناسب لمستواك الدراسي", yourLevel: "مستواك", aiTutor: "معلم رياضيات ذكي", errorMsg: "حدث خطأ. حاول مرة أخرى.",
      fractions: "كسور", percentages: "نسب مئوية", geometry: "هندسة", equations: "معادلات", statistics: "إحصاء",
      exponents: "أسس", calculus: "تفاضل وتكامل", linearAlgebra: "جبر خطي", diffEq: "معادلات تفاضلية",
      series: "متسلسلات", discreteMath: "رياضيات منفصلة", algebra: "جبر", trigonometry: "مثلثات", functions: "دوال",
    },
    zh: {
      welcome: "欢迎使用 MathMaxx", welcomeSub: "你的AI数学导师。问我任何数学问题，我会一步步解释。",
      chat: "聊天", quiz: "测验", clearChat: "清除聊天", askPlaceholder: "问一个数学问题...",
      disclaimer: "MathMaxx可能会出错。请验证重要计算。", today: "今天", tryAsking: "试试问：",
      mathQuiz: "数学测验", quizSub: "生成任何主题的数学测验", mathTopic: "数学主题",
      topicPlaceholder: "例如：二次方程、三角函数、积分...", schoolLevel: "学习阶段",
      middleSchool: "初中", middleSchoolDesc: "7-9年级", highSchool: "高中", highSchoolDesc: "10-12年级",
      university: "大学", universityDesc: "高等教育", questions: "题", generateQuiz: "生成测验",
      quizzesToday: "今日测验", creatingQuiz: "正在创建测验...", generating: "生成中", questionsOn: "题关于",
      submitAnswers: "提交答案", reviewMistakes: "用AI复习错题", newQuiz: "新测验", retryQuiz: "重试",
      solution: "解答", perfectScore: "满分！", greatJob: "做得好！", goodEffort: "不错！继续练习。",
      keepStudying: "继续加油！", premiumTitle: "升级到Premium",
      premiumDesc: "免费消息已用完。升级获取无限访问！",
      upgrade: "升级到Premium", goBack: "返回",
      dailyLimitChat: `已达到每日${DAILY_LIMITS.chatMessages}条消息限制。`,
      dailyLimitQuiz: `已达到每日${DAILY_LIMITS.quizzes}次测验限制。`,
      quizContext: "我记得你的测验。问我任何问题！", helpUnderstand: "帮我理解",
      exPrompt1: "解 x² + 5x + 6 = 0", exPrompt2: "解释导数是怎么回事", exPrompt3: "什么是勾股定理？",
      feat1: "逐步解题", feat2: "互动数学测验", feat3: "从代数到微积分的任何主题",
      feat4: "适合你的学习阶段", yourLevel: "你的阶段", aiTutor: "AI数学导师", errorMsg: "出了点问题，请重试。",
      fractions: "分数", percentages: "百分比", geometry: "几何", equations: "方程", statistics: "统计",
      exponents: "指数", calculus: "微积分", linearAlgebra: "线性代数", diffEq: "微分方程",
      series: "级数", discreteMath: "离散数学", algebra: "代数", trigonometry: "三角函数", functions: "函数",
    },
    ja: {
      welcome: "MathMaxxへようこそ", welcomeSub: "AI数学チューター。何でも聞いてください。ステップバイステップで説明します。",
      chat: "チャット", quiz: "クイズ", clearChat: "チャットを消去", askPlaceholder: "数学の質問をしてください...",
      disclaimer: "MathMaxxは間違える場合があります。重要な計算は確認してください。", today: "今日", tryAsking: "こんな質問を試してみて：",
      mathQuiz: "数学クイズ", quizSub: "どんなトピックでもクイズを作成", mathTopic: "数学のトピック",
      topicPlaceholder: "例：二次方程式、三角関数、積分...", schoolLevel: "学年",
      middleSchool: "中学校", middleSchoolDesc: "中1〜中3", highSchool: "高校", highSchoolDesc: "高1〜高3",
      university: "大学", universityDesc: "高等教育", questions: "問", generateQuiz: "クイズ作成",
      quizzesToday: "今日のクイズ", creatingQuiz: "クイズを作成中...", generating: "生成中", questionsOn: "問",
      submitAnswers: "回答を送信", reviewMistakes: "AIでミスを復習", newQuiz: "新しいクイズ", retryQuiz: "もう一度",
      solution: "解答", perfectScore: "満点！", greatJob: "よくできました！", goodEffort: "いい調子！練習を続けよう。",
      keepStudying: "勉強を続けよう！", premiumTitle: "Premiumにアップグレード",
      premiumDesc: "無料メッセージを使い切りました。アップグレードして無制限アクセスを！",
      upgrade: "Premiumにアップグレード", goBack: "戻る",
      dailyLimitChat: `1日${DAILY_LIMITS.chatMessages}メッセージの制限に達しました。`,
      dailyLimitQuiz: `1日${DAILY_LIMITS.quizzes}クイズの制限に達しました。`,
      quizContext: "クイズを覚えています。質問してください！", helpUnderstand: "理解を助けて",
      exPrompt1: "x² + 5x + 6 = 0 を解け", exPrompt2: "微分の仕組みを説明して", exPrompt3: "ピタゴラスの定理とは？",
      feat1: "ステップバイステップの解法", feat2: "インタラクティブなクイズ", feat3: "代数から微積分まで",
      feat4: "あなたの学年に合わせて", yourLevel: "あなたのレベル", aiTutor: "AI数学チューター", errorMsg: "エラーが発生しました。もう一度お試しください。",
      fractions: "分数", percentages: "百分率", geometry: "幾何", equations: "方程式", statistics: "統計",
      exponents: "指数", calculus: "微積分", linearAlgebra: "線形代数", diffEq: "微分方程式",
      series: "級数", discreteMath: "離散数学", algebra: "代数", trigonometry: "三角関数", functions: "関数",
    },
    ko: {
      welcome: "MathMaxx에 오신 걸 환영합니다", welcomeSub: "AI 수학 튜터. 무엇이든 물어보세요. 단계별로 설명해 드립니다.",
      chat: "채팅", quiz: "퀴즈", clearChat: "채팅 지우기", askPlaceholder: "수학 질문을 하세요...",
      disclaimer: "MathMaxx는 실수할 수 있습니다. 중요한 계산을 확인하세요.", today: "오늘", tryAsking: "이런 질문을 해보세요:",
      mathQuiz: "수학 퀴즈", quizSub: "어떤 주제든 퀴즈를 만들어 보세요", mathTopic: "수학 주제",
      topicPlaceholder: "예: 이차방정식, 삼각함수, 적분...", schoolLevel: "학년",
      middleSchool: "중학교", middleSchoolDesc: "1-3학년", highSchool: "고등학교", highSchoolDesc: "1-3학년",
      university: "대학교", universityDesc: "고등교육", questions: "문제", generateQuiz: "퀴즈 만들기",
      quizzesToday: "오늘의 퀴즈", creatingQuiz: "퀴즈 만드는 중...", generating: "생성 중", questionsOn: "문제",
      submitAnswers: "답 제출", reviewMistakes: "AI로 오답 복습", newQuiz: "새 퀴즈", retryQuiz: "다시 풀기",
      solution: "풀이", perfectScore: "만점!", greatJob: "잘했어요!", goodEffort: "좋은 노력! 계속 연습하세요.",
      keepStudying: "계속 공부하세요!", premiumTitle: "Premium으로 업그레이드",
      premiumDesc: "무료 메시지를 모두 사용했습니다. 업그레이드하세요!",
      upgrade: "Premium으로 업그레이드", goBack: "돌아가기",
      dailyLimitChat: `일일 ${DAILY_LIMITS.chatMessages}개 메시지 한도에 도달했습니다.`,
      dailyLimitQuiz: `일일 ${DAILY_LIMITS.quizzes}개 퀴즈 한도에 도달했습니다.`,
      quizContext: "퀴즈를 기억합니다. 질문하세요!", helpUnderstand: "이해를 도와주세요",
      exPrompt1: "x² + 5x + 6 = 0 풀기", exPrompt2: "미분이 어떻게 작동하는지 설명해줘", exPrompt3: "피타고라스 정리란?",
      feat1: "단계별 풀이", feat2: "인터랙티브 퀴즈", feat3: "대수부터 미적분까지",
      feat4: "학년에 맞춤", yourLevel: "내 레벨", aiTutor: "AI 수학 튜터", errorMsg: "오류가 발생했습니다. 다시 시도하세요.",
      fractions: "분수", percentages: "백분율", geometry: "기하", equations: "방정식", statistics: "통계",
      exponents: "지수", calculus: "미적분", linearAlgebra: "선형대수", diffEq: "미분방정식",
      series: "급수", discreteMath: "이산수학", algebra: "대수", trigonometry: "삼각함수", functions: "함수",
    },
    hi: {
      welcome: "MathMaxx में आपका स्वागत है", welcomeSub: "आपका AI गणित शिक्षक। कुछ भी पूछें, मैं कदम दर कदम समझाऊंगा।",
      chat: "चैट", quiz: "क्विज़", clearChat: "चैट साफ़ करें", askPlaceholder: "गणित का सवाल पूछें...",
      disclaimer: "MathMaxx गलती कर सकता है। महत्वपूर्ण गणना की जाँच करें।", today: "आज", tryAsking: "पूछने की कोशिश करें:",
      mathQuiz: "गणित क्विज़", quizSub: "किसी भी विषय पर क्विज़ बनाएं", mathTopic: "गणित विषय",
      topicPlaceholder: "जैसे: द्विघात समीकरण, त्रिकोणमिति, समाकलन...", schoolLevel: "स्कूल स्तर",
      middleSchool: "मिडिल स्कूल", middleSchoolDesc: "कक्षा 7-10", highSchool: "हाई स्कूल", highSchoolDesc: "कक्षा 11-12",
      university: "विश्वविद्यालय", universityDesc: "उच्च शिक्षा", questions: "सवाल", generateQuiz: "क्विज़ बनाएं",
      quizzesToday: "आज के क्विज़", creatingQuiz: "क्विज़ बना रहे हैं...", generating: "बन रहा है", questionsOn: "सवाल",
      submitAnswers: "जवाब भेजें", reviewMistakes: "AI से गलतियाँ जाँचें", newQuiz: "नई क्विज़", retryQuiz: "फिर से कोशिश करें",
      solution: "हल", perfectScore: "पूर्ण अंक!", greatJob: "बहुत बढ़िया!", goodEffort: "अच्छा प्रयास! अभ्यास जारी रखें।",
      keepStudying: "पढ़ाई जारी रखें!", premiumTitle: "Premium में अपग्रेड करें",
      premiumDesc: "मुफ्त संदेश समाप्त हो गए। असीमित पहुँच के लिए अपग्रेड करें!",
      upgrade: "Premium में अपग्रेड करें", goBack: "वापस जाएं",
      dailyLimitChat: `आपने दैनिक ${DAILY_LIMITS.chatMessages} संदेशों की सीमा पूरी कर ली है।`,
      dailyLimitQuiz: `आपने दैनिक ${DAILY_LIMITS.quizzes} क्विज़ की सीमा पूरी कर ली है।`,
      quizContext: "मुझे आपकी क्विज़ याद है। सवालों के बारे में पूछें!", helpUnderstand: "समझने में मदद करें",
      exPrompt1: "x² + 5x + 6 = 0 हल करें", exPrompt2: "अवकलन कैसे काम करता है बताएं", exPrompt3: "पाइथागोरस प्रमेय क्या है?",
      feat1: "कदम दर कदम समाधान", feat2: "इंटरैक्टिव क्विज़", feat3: "बीजगणित से कैलकुलस तक हर विषय",
      feat4: "आपके स्तर के अनुसार", yourLevel: "आपका स्तर", aiTutor: "AI गणित शिक्षक", errorMsg: "कुछ गलत हुआ। फिर से कोशिश करें।",
      fractions: "भिन्न", percentages: "प्रतिशत", geometry: "ज्यामिति", equations: "समीकरण", statistics: "सांख्यिकी",
      exponents: "घातांक", calculus: "कैलकुलस", linearAlgebra: "रैखिक बीजगणित", diffEq: "अवकल समीकरण",
      series: "श्रेणियाँ", discreteMath: "विवेकी गणित", algebra: "बीजगणित", trigonometry: "त्रिकोणमिति", functions: "फलन",
    },
  };
  return translations[lang] || translations.en;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MathMaxxView({ onBack, isPremium, user }: MathMaxxViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === "dark" ||
    (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const appLang = settings.language || "en";

  // Language state — defaults to app setting, user can override in MathMaxx
  const [mathLang, setMathLang] = useState(() => {
    if (typeof window === "undefined") return appLang;
    return localStorage.getItem("mathmaxx_lang") || appLang;
  });
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // UI strings - fully translated for all 20 languages
  const s = getMathStrings(mathLang);

  // Load KaTeX CSS
  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.querySelector(`link[href="${KATEX_CSS_URL}"]`);
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = KATEX_CSS_URL;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
  }, []);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledUpRef = useRef(false);

  // Quiz state
  const [activeTab, setActiveTab] = useState<"chat" | "quiz">("chat");
  const [quizTopic, setQuizTopic] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<"middle_school" | "high_school" | "university">(() => {
    if (typeof window === "undefined") return "high_school";
    return (localStorage.getItem("mathmaxx_school_level") as "middle_school" | "high_school" | "university") || "high_school";
  });
  const [quizCount, setQuizCount] = useState(5);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");

  // Shared quiz context — chat remembers the last quiz
  const [lastQuizResult, setLastQuizResult] = useState<QuizResult | null>(null);

  // Premium/free gate state
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  // Rate limit state (premium users)
  const [chatUsage, setChatUsage] = useState(0);
  const [quizUsage, setQuizUsage] = useState(0);

  useEffect(() => {
    setChatUsage(getDailyUsage("chat"));
    setQuizUsage(getDailyUsage("quiz"));
    setFreeMessagesUsed(getFreeMessageCount());
  }, []);

  // Persist school level preference
  useEffect(() => {
    localStorage.setItem("mathmaxx_school_level", schoolLevel);
  }, [schoolLevel]);

  // Auto-scroll chat — only if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset scroll lock when user sends a new message
  useEffect(() => {
    if (!isStreaming) {
      userScrolledUpRef.current = false;
    }
  }, [isStreaming]);

  // Track user scroll position
  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    // If user is more than 100px from the bottom, they're "scrolled up"
    userScrolledUpRef.current = distanceFromBottom > 100;
  }, []);

  // Auto-resize textarea
  const handleTextareaResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 150) + "px";
    setInputText(target.value);
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be less than 10MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setUploadedImage(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Remove uploaded image
  const handleRemoveImage = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Quick topics — adapt based on school level, labels from translation, topics in English (AI handles language)
  const QUICK_TOPICS = schoolLevel === "middle_school" ? [
    { label: s.fractions, topic: "fractions" },
    { label: s.percentages, topic: "percentages" },
    { label: s.geometry, topic: "area and perimeter" },
    { label: s.equations, topic: "simple equations" },
    { label: s.statistics, topic: "mean and median" },
    { label: s.exponents, topic: "exponents and roots" },
  ] : schoolLevel === "university" ? [
    { label: s.calculus, topic: "integrals and derivatives" },
    { label: s.linearAlgebra, topic: "matrices and eigenvalues" },
    { label: s.diffEq, topic: "differential equations" },
    { label: s.statistics, topic: "probability distributions" },
    { label: s.series, topic: "convergence and series" },
    { label: s.discreteMath, topic: "combinatorics" },
  ] : [
    { label: s.algebra, topic: "algebra and equations" },
    { label: s.geometry, topic: "geometry and shapes" },
    { label: s.trigonometry, topic: "trigonometry" },
    { label: s.functions, topic: "functions and graphs" },
    { label: s.calculus, topic: "derivatives and integrals" },
    { label: s.statistics, topic: "statistics and probability" },
  ];

  // ============================================================
  // CHAT: Send message
  // ============================================================

  const handleSendMessage = async (overrideMessage?: string) => {
    const msgText = overrideMessage || inputText.trim();
    if (!msgText || isStreaming) return;

    // Free users: check if they've used their 3 free messages
    if (!isPremium) {
      if (freeMessagesUsed >= FREE_MESSAGE_LIMIT) {
        setShowPremiumPopup(true);
        return;
      }
    }

    // Premium users: check daily rate limit
    if (isPremium && chatUsage >= DAILY_LIMITS.chatMessages) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "ai",
        text: s.dailyLimitChat,
        timestamp: Date.now(),
      }]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: msgText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsStreaming(true);

    // Track usage
    if (isPremium) {
      incrementDailyUsage("chat");
      setChatUsage(prev => prev + 1);
    } else {
      incrementFreeMessages();
      setFreeMessagesUsed(prev => {
        const next = prev + 1;
        // Show premium popup AFTER the response comes back if this was their last free
        return next;
      });
    }

    if (inputRef.current) inputRef.current.style.height = "auto";

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMessageId, role: "ai", text: "", timestamp: Date.now() }]);

    try {
      // Build history, including quiz context if available
      const chatHistory = messages
        .filter(m => m.role === "user" || m.role === "ai")
        .map(m => ({ role: m.role, text: m.text }));

      // If we have a quiz result, inject it as context
      let quizContext = "";
      if (lastQuizResult) {
        const qr = lastQuizResult;
        quizContext = `[QUIZ CONTEXT - The student just completed a quiz on "${qr.quiz.topic}" (${qr.quiz.difficulty}). Score: ${qr.score.correct}/${qr.score.total}. `;
        if (qr.wrongQuestions.length > 0) {
          quizContext += "Questions they got wrong: " + qr.wrongQuestions.map((w, i) =>
            `(${i + 1}) "${w.question}" — they answered "${w.userAnswer}" but correct was "${w.correctAnswer}"`
          ).join("; ");
        } else {
          quizContext += "They got all questions correct!";
        }
        quizContext += "]";
      }

      const response = await fetch("/api/mathmaxx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: quizContext ? `${quizContext}\n\n${msgText}` : msgText,
          image: uploadedImage, // Include base64 image if uploaded
          history: chatHistory,
          userId: user?.id,
          language: mathLang,
          schoolLevel: schoolLevel,
        }),
      });

      // Clear uploaded image after sending
      if (uploadedImage) {
        handleRemoveImage();
      }

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setMessages(prev =>
                    prev.map(m => m.id === aiMessageId ? { ...m, text: accumulatedText } : m)
                  );
                }
              } catch { /* partial chunk */ }
            }
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === aiMessageId ? { ...m, text: s.errorMsg } : m)
      );
    } finally {
      setIsStreaming(false);
      // After the response, if free user just used their last message, show popup
      if (!isPremium && freeMessagesUsed + 1 >= FREE_MESSAGE_LIMIT) {
        setTimeout(() => setShowPremiumPopup(true), 1500);
      }
    }
  };

  // ============================================================
  // QUIZ: Generate
  // ============================================================

  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim() || isGeneratingQuiz) return;

    if (isPremium && quizUsage >= DAILY_LIMITS.quizzes) {
      setQuizError(s.dailyLimitQuiz);
      return;
    }

    setIsGeneratingQuiz(true);
    setQuizError("");
    setCurrentQuiz(null);
    setQuizAnswers({});
    setQuizSubmitted(false);

    if (isPremium) {
      incrementDailyUsage("quiz");
      setQuizUsage(prev => prev + 1);
    }

    // AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch("/api/mathmaxx/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: quizTopic,
          schoolLevel: schoolLevel,
          count: quizCount,
          language: mathLang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate quiz");
      }

      const quiz = await response.json();
      if (quiz.error) throw new Error(quiz.error);

      // Ensure quiz has questions
      if (!quiz.questions || quiz.questions.length === 0) {
        throw new Error("Quiz has no questions");
      }

      setCurrentQuiz(quiz);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        setQuizError(s.errorMsg);
      } else {
        setQuizError(s.errorMsg);
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // ============================================================
  // QUIZ: Scoring
  // ============================================================

  /** Normalize answer letter for comparison */
  const normalizeAnswer = (raw: string): string => {
    if (!raw) return "";
    const cleaned = raw.trim().toUpperCase();
    const match = cleaned.match(/^([A-D])/);
    return match ? match[1] : cleaned;
  };

  const getQuizScore = () => {
    if (!currentQuiz) return { correct: 0, total: 0 };
    let correct = 0;
    for (const q of currentQuiz.questions) {
      const answer = normalizeAnswer(quizAnswers[q.id] || "");
      const correctAns = normalizeAnswer(q.correct);
      if (answer && answer === correctAns) correct++;
    }
    return { correct, total: currentQuiz.questions.length };
  };

  const getWrongQuestions = () => {
    if (!currentQuiz) return [];
    return currentQuiz.questions.filter(q => {
      const answer = normalizeAnswer(quizAnswers[q.id] || "");
      const correctAns = normalizeAnswer(q.correct);
      return !answer || answer !== correctAns;
    });
  };

  /** Submit quiz and save results for chat context */
  const handleSubmitQuiz = () => {
    if (!currentQuiz) return;
    setQuizSubmitted(true);

    const score = getQuizScore();
    const wrong = getWrongQuestions();

    const result: QuizResult = {
      quiz: currentQuiz,
      answers: quizAnswers,
      score,
      wrongQuestions: wrong.map(q => {
        const userAnsLetter = normalizeAnswer(quizAnswers[q.id] || "");
        const correctLetter = normalizeAnswer(q.correct);
        // Get option text for the user's answer and correct answer
        const userAnswerText = q.options
          ? q.options.find((_, i) => String.fromCharCode(65 + i) === userAnsLetter) || userAnsLetter || "(no answer)"
          : userAnsLetter || "(no answer)";
        const correctAnswerText = q.options
          ? q.options.find((_, i) => String.fromCharCode(65 + i) === correctLetter) || correctLetter
          : correctLetter;
        return {
          question: q.question,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          explanation: q.explanation,
        };
      }),
    };

    setLastQuizResult(result);
  };

  /** Switch to chat and auto-send a review request for wrong answers */
  const handleReviewWithAI = () => {
    const wrong = getWrongQuestions();
    if (wrong.length === 0) return;

    const reviewPrompt = wrong.map((q, i) => {
      const userAns = normalizeAnswer(quizAnswers[q.id] || "");
      const correctAns = normalizeAnswer(q.correct);
      const userOptText = q.options ? (q.options.find((_, idx) => String.fromCharCode(65 + idx) === userAns) || userAns || "(no answer)") : userAns;
      const correctOptText = q.options ? (q.options.find((_, idx) => String.fromCharCode(65 + idx) === correctAns) || correctAns) : correctAns;
      return `${i + 1}. ${q.question}\n   My answer: ${userOptText}\n   Correct: ${correctOptText}`;
    }).join("\n\n");

    const fullMessage = `I just took a quiz on "${currentQuiz?.topic}" and got these wrong. Please explain each one step by step so I can understand:\n\n${reviewPrompt}`;

    setActiveTab("chat");
    // Auto-send the review request
    setTimeout(() => handleSendMessage(fullMessage), 200);
  };

  // ============================================================
  // PREMIUM POPUP (for free users after 3 messages)
  // ============================================================

  if (showPremiumPopup && !isPremium) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: isDarkMode ? "#0f1724" : "#f8fafc" }}>
        <div className="max-w-md w-full text-center p-8 rounded-2xl" style={{ backgroundColor: isDarkMode ? "#1a2332" : "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: "#3b82f6" }}>
            <LockIcon />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
            {s.premiumTitle}
          </h2>
          <p className="text-sm mb-6" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
            {s.premiumDesc}
          </p>
          <div className="space-y-3 text-left mb-8">
            {[s.feat1, s.feat2, s.feat3, s.feat4].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: isDarkMode ? "rgba(6,182,212,0.1)" : "rgba(6,182,212,0.05)" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#06b6d4", color: "#fff", fontSize: "10px" }}>&#10003;</div>
                <span className="text-sm font-medium" style={{ color: isDarkMode ? "#e2e8f0" : "#334155" }}>{feature}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event('showPremium'))}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: "#3b82f6" }}
          >
            {s.upgrade}
          </button>
          <button onClick={onBack} className="mt-4 text-sm font-medium" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
            {s.goBack}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN LAYOUT — works for BOTH free (first 3 msgs) and premium
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: isDarkMode ? "#0f1724" : "#f8fafc" }}>


      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{
          backgroundColor: isDarkMode ? "rgba(15, 23, 36, 0.95)" : "rgba(255, 255, 255, 0.95)",
          borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (activeTab === "quiz") {
              // Go back to chat tab instead of exiting MathMaxx
              setActiveTab("chat");
            } else {
              onBack();
            }
          }} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
            <BackIcon />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#3b82f6" }}>
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>MathMaxx</h1>
              <p className="text-xs" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
                {s.aiTutor}
              </p>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: isDarkMode ? "#e2e8f0" : "#334155",
              border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            }}
          >
            <span>{MATH_LANGUAGES.find(l => l.code === mathLang)?.flag || "🌐"}</span>
            <span className="hidden sm:inline">{MATH_LANGUAGES.find(l => l.code === mathLang)?.label || "English"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {showLangDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-48 max-h-64 overflow-y-auto rounded-xl shadow-xl z-50"
                style={{
                  backgroundColor: isDarkMode ? "#1a2332" : "#ffffff",
                  border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                }}
              >
                {MATH_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setMathLang(lang.code);
                      localStorage.setItem("mathmaxx_lang", lang.code);
                      setShowLangDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all text-left"
                    style={{
                      backgroundColor: mathLang === lang.code ? (isDarkMode ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.08)") : "transparent",
                      color: mathLang === lang.code ? "#06b6d4" : (isDarkMode ? "#e2e8f0" : "#334155"),
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tab Switcher — only show quiz tab for premium users */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
          <button
            onClick={() => setActiveTab("chat")}
            className="px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: activeTab === "chat" ? (isDarkMode ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.1)") : "transparent",
              color: activeTab === "chat" ? "#06b6d4" : (isDarkMode ? "#94a3b8" : "#64748b"),
            }}
          >
            <ChatBubbleIcon /> {s.chat}
          </button>
          {isPremium && (
            <button
              onClick={() => setActiveTab("quiz")}
              className="px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === "quiz" ? (isDarkMode ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)") : "transparent",
                color: activeTab === "quiz" ? "#3b82f6" : (isDarkMode ? "#94a3b8" : "#64748b"),
              }}
            >
              <QuizIcon /> {s.quiz}
            </button>
          )}
        </div>

        {activeTab === "chat" && messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setLastQuizResult(null); }}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}
            title={s.clearChat}
          >
            <ClearIcon />
          </button>
        )}


      </div>

      {/* ============================================================ */}
      {/* CHAT TAB                                                      */}
      {/* ============================================================ */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col">
          <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto px-4 py-6" style={{ maxHeight: "calc(100vh - 160px)" }}>
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 max-w-xl mx-auto">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#3b82f6" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                  {s.welcome}
                </h2>
                <p className="text-sm mb-6 max-w-sm" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
                  {s.welcomeSub}
                </p>

                {/* School level selector — compact pills */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs font-medium" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
                    {s.yourLevel}:
                  </span>
                  <div className="flex gap-1.5 rounded-lg p-1" style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" }}>
                    {(["middle_school", "high_school", "university"] as const).map((lvl) => {
                      const label = lvl === "middle_school" ? s.middleSchool : lvl === "high_school" ? s.highSchool : s.university;
                      const isActive = schoolLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          onClick={() => setSchoolLevel(lvl)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                          style={{
                            backgroundColor: isActive ? "rgba(6,182,212,0.2)" : "transparent",
                            color: isActive ? "#06b6d4" : (isDarkMode ? "#64748b" : "#94a3b8"),
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quiz context banner */}
                {lastQuizResult && (
                  <div className="w-full max-w-lg mb-6 p-4 rounded-xl" style={{
                    backgroundColor: isDarkMode ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.05)",
                    border: `1px solid ${isDarkMode ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)"}`,
                  }}>
                    <p className="text-sm font-medium" style={{ color: "#3b82f6" }}>
                      {s.quizContext}
                    </p>
                    <p className="text-xs mt-1" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
                      {lastQuizResult.quiz.topic} — {lastQuizResult.score.correct}/{lastQuizResult.score.total}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
                  {QUICK_TOPICS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { setInputText(`${s.helpUnderstand} ${item.topic}`); inputRef.current?.focus(); }}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                      style={{
                        backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        color: isDarkMode ? "#e2e8f0" : "#334155",
                        border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-2 w-full max-w-lg">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>{s.tryAsking}</p>
                  {[s.exPrompt1, s.exPrompt2, s.exPrompt3].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => { setInputText(prompt); inputRef.current?.focus(); }}
                      className="block w-full text-left px-4 py-3 rounded-xl text-sm transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: isDarkMode ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.04)",
                        color: isDarkMode ? "#94a3b8" : "#64748b",
                        border: `1px solid ${isDarkMode ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.1)"}`,
                      }}
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            <div className="max-w-2xl mx-auto w-full space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl"
                    style={{
                      backgroundColor: msg.role === "user"
                        ? "#06b6d4"
                        : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                      color: msg.role === "user" ? "#ffffff" : isDarkMode ? "#e2e8f0" : "#1e293b",
                      borderBottomRightRadius: msg.role === "user" ? "6px" : undefined,
                      borderBottomLeftRadius: msg.role === "ai" ? "6px" : undefined,
                    }}
                  >
                    {msg.role === "ai" && msg.text === "" && isStreaming ? (
                      <div className="flex gap-1 py-1">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#06b6d4", animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#06b6d4", animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#06b6d4", animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <div
                        className="text-sm leading-relaxed mathmaxx-content"
                        dangerouslySetInnerHTML={{ __html: renderMathText(msg.text) }}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div
            className="sticky bottom-0 px-4 py-3 border-t"
            style={{
              backgroundColor: isDarkMode ? "rgba(15, 23, 36, 0.95)" : "rgba(255, 255, 255, 0.95)",
              borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="max-w-2xl mx-auto">
              {/* Image preview */}
              {imagePreview && (
                <div className="mb-2 relative inline-block">
                  <img src={imagePreview} alt="Upload preview" className="h-20 rounded-lg border" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#ef4444", color: "#fff" }}
                  >
                    <XIcon />
                  </button>
                </div>
              )}
              
              <div
                className="flex items-end gap-2 rounded-xl px-4 py-2"
                style={{
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                {/* Image upload button */}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg transition-all hover:scale-110 flex-shrink-0 mb-0.5"
                  style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}
                  title="Upload image of math problem"
                >
                  <ImageIcon />
                </button>
                
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={handleTextareaResize}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder={s.askPlaceholder}
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm resize-none py-2"
                  style={{ color: isDarkMode ? "#ffffff" : "#000000", maxHeight: "150px" }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isStreaming}
                  className="p-2.5 rounded-xl transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                  style={{
                    background: inputText.trim() && !isStreaming ? "#3b82f6" : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                    color: inputText.trim() && !isStreaming ? "#ffffff" : (isDarkMode ? "#64748b" : "#94a3b8"),
                  }}
                >
                  <SendIcon />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs" style={{ color: isDarkMode ? "#475569" : "#94a3b8" }}>
                  {s.disclaimer}
                </p>
                {isPremium && (
                  <p className="text-xs" style={{ color: isDarkMode ? "#475569" : "#94a3b8" }}>
                    {chatUsage}/{DAILY_LIMITS.chatMessages} {s.today}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUIZ TAB (premium only)                                       */}
      {/* ============================================================ */}
      {activeTab === "quiz" && isPremium && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!currentQuiz && !isGeneratingQuiz ? (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "#3b82f6" }}>
                  <QuizIcon />
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>{s.mathQuiz}</h2>
                <p className="text-sm" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>{s.quizSub}</p>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>{s.mathTopic}</label>
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder={s.topicPlaceholder}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                    color: isDarkMode ? "#ffffff" : "#000000",
                    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateQuiz()}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK_TOPICS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setQuizTopic(item.topic)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                      style={{
                        backgroundColor: quizTopic === item.topic ? "rgba(59,130,246,0.2)" : (isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"),
                        color: quizTopic === item.topic ? "#3b82f6" : (isDarkMode ? "#94a3b8" : "#64748b"),
                        border: `1px solid ${quizTopic === item.topic ? "#3b82f6" : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")}`,
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* School Level */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>{s.schoolLevel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "middle_school" as const, label: s.middleSchool, desc: s.middleSchoolDesc, rgb: "34,197,94", hex: "#22c55e" },
                    { key: "high_school" as const, label: s.highSchool, desc: s.highSchoolDesc, rgb: "6,182,212", hex: "#06b6d4" },
                    { key: "university" as const, label: s.university, desc: s.universityDesc, rgb: "139,92,246", hex: "#3b82f6" },
                  ]).map((lvl) => (
                    <button
                      key={lvl.key}
                      onClick={() => setSchoolLevel(lvl.key)}
                      className="px-3 py-3 rounded-xl font-medium transition-all text-center"
                      style={{
                        backgroundColor: schoolLevel === lvl.key
                          ? `rgba(${lvl.rgb},0.2)` : isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        color: schoolLevel === lvl.key ? lvl.hex : (isDarkMode ? "#94a3b8" : "#64748b"),
                        border: `2px solid ${schoolLevel === lvl.key ? lvl.hex : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")}`,
                      }}
                    >
                      <div className="text-sm font-semibold">{lvl.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count slider */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                  {s.questions}: <span style={{ color: "#3b82f6" }}>{quizCount}</span>
                </label>
                <input
                  type="range" min="3" max="15" step="1" value={quizCount}
                  onChange={(e) => setQuizCount(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((quizCount - 3) / 12) * 100}%, ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} ${((quizCount - 3) / 12) * 100}%, ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} 100%)`,
                    accentColor: "#3b82f6",
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
                  <span>3</span><span>15</span>
                </div>
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={!quizTopic.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "#3b82f6" }}
              >
                <SparkleIcon /> {s.generateQuiz}
              </button>

              {quizError && <p className="text-center text-sm text-red-500">{quizError}</p>}
              <p className="text-center text-xs" style={{ color: isDarkMode ? "#475569" : "#94a3b8" }}>
                {quizUsage}/{DAILY_LIMITS.quizzes} {s.quizzesToday}
              </p>
            </div>
          ) : isGeneratingQuiz ? (
            <div className="max-w-sm mx-auto text-center py-12">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: "#3b82f6" }}>
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>{s.creatingQuiz}</h3>
              <p className="text-sm" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
                {s.generating} {quizCount} {s.questionsOn} {quizTopic}
              </p>
            </div>
          ) : currentQuiz ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>{currentQuiz.title}</h2>
                <p className="text-sm" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
                  {currentQuiz.questions.length} {s.questions.toLowerCase()} &middot; {currentQuiz.difficulty}
                </p>
              </div>

              {/* Score banner */}
              {quizSubmitted && (() => {
                const score = getQuizScore();
                const ratio = score.total > 0 ? score.correct / score.total : 0;
                return (
                  <div className="mb-6 p-5 rounded-2xl text-center" style={{
                    background: ratio === 1
                      ? "rgba(34,197,94,0.12)"
                      : ratio >= 0.6
                      ? "rgba(59,130,246,0.12)"
                      : "rgba(239,68,68,0.12)",
                    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
                  }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: isDarkMode ? "#ffffff" : "#000000" }}>
                      {score.correct} / {score.total}
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
                      {ratio === 1 ? s.perfectScore : ratio >= 0.8 ? s.greatJob : ratio >= 0.6 ? s.goodEffort : s.keepStudying}
                    </p>
                  </div>
                );
              })()}

              {/* Questions */}
              <div className="space-y-6">
                {currentQuiz.questions.map((q, qIndex) => {
                  const userAnswer = normalizeAnswer(quizAnswers[q.id] || "");
                  const correctAnswer = normalizeAnswer(q.correct);
                  const isCorrect = quizSubmitted && userAnswer === correctAnswer;

                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-2xl"
                      style={{
                        backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff",
                        border: `1px solid ${quizSubmitted
                          ? isCorrect ? "rgba(34,197,94,0.3)" : userAnswer ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"
                          : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                      }}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{
                          backgroundColor: quizSubmitted ? (isCorrect ? "#22c55e" : "#ef4444") : "#3b82f6",
                          color: "#ffffff",
                        }}>
                          {quizSubmitted ? (isCorrect ? "\u2713" : "\u2717") : qIndex + 1}
                        </div>
                        <div
                          className="text-sm font-medium mathmaxx-content"
                          style={{ color: isDarkMode ? "#e2e8f0" : "#1e293b" }}
                          dangerouslySetInnerHTML={{ __html: renderMathText(q.question) }}
                        />
                      </div>

                      {q.options && (
                        <div className="space-y-2 ml-10">
                          {q.options.map((opt, optIndex) => {
                            const optLetter = String.fromCharCode(65 + optIndex);
                            const isSelected = userAnswer === optLetter;
                            const isCorrectOpt = quizSubmitted && optLetter === correctAnswer;

                            return (
                              <button
                                key={optIndex}
                                onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id]: optLetter }))}
                                disabled={quizSubmitted}
                                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                                style={{
                                  backgroundColor: quizSubmitted
                                    ? isCorrectOpt ? "rgba(34,197,94,0.15)" : isSelected && !isCorrect ? "rgba(239,68,68,0.1)" : (isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)")
                                    : isSelected ? "rgba(59,130,246,0.15)" : (isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"),
                                  color: isDarkMode ? "#e2e8f0" : "#1e293b",
                                  border: `2px solid ${quizSubmitted
                                    ? isCorrectOpt ? "#22c55e" : isSelected && !isCorrect ? "#ef4444" : "transparent"
                                    : isSelected ? "#3b82f6" : "transparent"}`,
                                  cursor: quizSubmitted ? "default" : "pointer",
                                }}
                              >
                                <span className="mathmaxx-content" dangerouslySetInnerHTML={{ __html: renderMathText(opt) }} />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {quizSubmitted && q.explanation && (
                        <div className="mt-4 ml-10 p-4 rounded-xl" style={{
                          backgroundColor: isDarkMode ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.04)",
                          border: `1px solid ${isDarkMode ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.1)"}`,
                        }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#06b6d4" }}>{s.solution}</p>
                          <div
                            className="text-sm mathmaxx-content leading-relaxed"
                            style={{ color: isDarkMode ? "#e2e8f0" : "#334155" }}
                            dangerouslySetInnerHTML={{ __html: renderMathText(q.explanation) }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex flex-col gap-3 pb-8">
                {!quizSubmitted ? (
                  <button
                    onClick={handleSubmitQuiz}
                    className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
                    style={{ background: "#3b82f6" }}
                  >
                    {s.submitAnswers}
                  </button>
                ) : (
                  <>
                    {getWrongQuestions().length > 0 && (
                      <button
                        onClick={handleReviewWithAI}
                        className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                        style={{ background: "#3b82f6" }}
                      >
                        <ChatBubbleIcon /> {s.reviewMistakes}
                      </button>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setCurrentQuiz(null); setQuizAnswers({}); setQuizSubmitted(false); }}
                        className="flex-1 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          color: isDarkMode ? "#ffffff" : "#000000",
                        }}
                      >
                        {s.newQuiz}
                      </button>
                      <button
                        onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}
                        className="flex-1 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: isDarkMode ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59,130,246,0.3)",
                        }}
                      >
                        {s.retryQuiz}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* KaTeX styles */}
      <style>{`
        .mathmaxx-content .katex-display {
          margin: 16px 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 0;
        }
        .mathmaxx-content .katex {
          font-size: 1.15em;
        }
        .mathmaxx-content .katex-display .katex {
          font-size: 1.3em;
        }
        .mathmaxx-content strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
