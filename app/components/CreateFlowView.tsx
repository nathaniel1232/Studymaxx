"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { generateFlashcards } from "../utils/flashcardGenerator";
import { Flashcard, getOrCreateUserId, getSavedFlashcardSets } from "../utils/storage";
import { getStudyFact } from "../utils/studyFacts";
import { useTranslation, useSettings } from "../contexts/SettingsContext";
import ArrowIcon from "./icons/ArrowIcon";
import PremiumModal from "./PremiumModal";

interface CreateFlowViewProps {
  onGenerateFlashcards: (cards: Flashcard[], subject: string, grade: string) => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3 | 4;
type MaterialType = "notes" | "pdf" | "youtube" | "image" | null;
type Grade = "A" | "B" | "C" | "D" | "E";

export default function CreateFlowView({ onGenerateFlashcards, onBack }: CreateFlowViewProps) {
  const t = useTranslation();
  const { settings } = useSettings();
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: Subject
  const [subject, setSubject] = useState("");
  
  // Step 2: Material
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(null);
  const [textInput, setTextInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Math mode (only for math subjects)
  const [includeMathProblems, setIncludeMathProblems] = useState(false);
  
  // Step 3: Grade
  const [targetGrade, setTargetGrade] = useState<Grade | null>(null);
  
  // Step 4: Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  
  // Premium state
  const [isPremium, setIsPremium] = useState(false);
  const [setsCreated, setSetsCreated] = useState(0);
  const [canCreateMore, setCanCreateMore] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumCheckLoading, setPremiumCheckLoading] = useState(true);

  // Check premium status on mount
  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const userId = getOrCreateUserId();
      const response = await fetch(`/api/premium/check?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium);
        setSetsCreated(data.setsCreated);
        setCanCreateMore(data.canCreateMore);
      } else {
        // Fallback to localStorage count
        const savedSets = getSavedFlashcardSets();
        const userSets = savedSets.filter(set => set.userId === userId);
        setSetsCreated(userSets.length);
        setCanCreateMore(userSets.length < 1);
      }
    } catch (error) {
      console.error('Premium check failed:', error);
      // Fallback to localStorage count
      const userId = getOrCreateUserId();
      const savedSets = getSavedFlashcardSets();
      const userSets = savedSets.filter(set => set.userId === userId);
      setSetsCreated(userSets.length);
      setCanCreateMore(userSets.length < 1);
    } finally {
      setPremiumCheckLoading(false);
    }
  };

  // Subject examples
  const getSubjectExamples = () => [
    { name: settings.language === "no" ? "Engelsk" : "English", emoji: "🇬🇧" },
    { name: settings.language === "no" ? "Matte" : "Math", emoji: "📐" },
    { name: settings.language === "no" ? "Biologi" : "Biology", emoji: "🧬" },
    { name: settings.language === "no" ? "Historie" : "History", emoji: "📜" },
    { name: settings.language === "no" ? "Naturfag" : "Chemistry", emoji: "⚗️" },
    { name: settings.language === "no" ? "Fysikk" : "Physics", emoji: "⚛️" }
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

  // Check if subject is math-related
  const isMathSubject = () => {
    const mathKeywords = ['math', 'maths', 'mathematics', 'matte', 'matematikk', 'algebra', 'calculus', 'geometry', 'statistics'];
    return mathKeywords.some(keyword => subject.toLowerCase().includes(keyword));
  };

  // Map grade to difficulty settings
  const getGenerationSettings = (grade: Grade) => {
    const settings = {
      A: { cardCount: 30, difficulty: "comprehensive", quizStrictness: "strict" },
      B: { cardCount: 25, difficulty: "thorough", quizStrictness: "moderate" },
      C: { cardCount: 20, difficulty: "standard", quizStrictness: "moderate" },
      D: { cardCount: 15, difficulty: "focused", quizStrictness: "lenient" },
      E: { cardCount: 12, difficulty: "essential", quizStrictness: "lenient" }
    };
    return settings[grade];
  };

  // Step navigation
  const handleContinueFromStep1 = () => {
    if (!subject.trim()) {
      setError(t("please_enter_subject") || "Please enter a subject");
      return;
    }
    setError("");
    setCurrentStep(2);
  };

  const handleContinueFromStep2 = () => {
    if (!selectedMaterial) {
      setError(t("please_choose_material") || "Please choose a material type");
      return;
    }
    
    if (selectedMaterial === "notes" && !textInput.trim()) {
      setError(t("please_add_notes") || "Please add your notes");
      return;
    }
    
    if (selectedMaterial === "youtube" && !youtubeUrl.trim()) {
      setError(t("please_add_youtube") || "Please add a YouTube URL");
      return;
    }
    
    if ((selectedMaterial === "pdf" || selectedMaterial === "image") && !uploadedFile) {
      setError(t("please_upload_file") || "Please upload a file");
      return;
    }
    
    setError("");
    setCurrentStep(3);
  };

  const handleContinueFromStep3 = () => {
    if (!targetGrade) {
      setError(t("please_choose_grade") || "Please choose your target grade");
      return;
    }
    
    // Check if user can create more sets
    if (!canCreateMore && !isPremium) {
      setShowPremiumModal(true);
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

  // File handling (simplified from InputView)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError("");

    // For PDF, extract text client-side
    if (file.type === "application/pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }
        
        setTextInput(fullText.trim());
      } catch (err) {
        setError(t("pdf_extract_failed_manual"));
      }
    } else if (file.type.startsWith("image/")) {
      // Handle image with OCR
      try {
        const Tesseract = await import("tesseract.js");
        const result = await Tesseract.recognize(file, "eng", {
          logger: (m) => console.log(m),
        });
        
        const extractedText = result.data.text;
        
        if (!extractedText || extractedText.trim().length === 0) {
          setError(t("no_text_image"));
          return;
        }
        
        setTextInput(extractedText);
      } catch (err) {
        setError("Failed to extract text from image. Please try another image.");
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
      } catch (err) {
        setError("Failed to extract text from file. Please try another format.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!targetGrade) return;
    
    setIsGenerating(true);
    setError("");

    try {
      const settings = getGenerationSettings(targetGrade);
      
      // Prepare the text to send
      let textToProcess = "";
      
      if (selectedMaterial === "notes" || selectedMaterial === "image") {
        textToProcess = textInput;
      } else if (selectedMaterial === "youtube") {
        // Extract from YouTube
        const formData = new FormData();
        formData.append("youtubeUrl", youtubeUrl);
        
        const response = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Failed to extract YouTube transcript");
        const data = await response.json();
        textToProcess = data.text;
      } else if (selectedMaterial === "pdf" && textInput) {
        textToProcess = textInput;
      }

      if (!textToProcess.trim()) {
        throw new Error("No content to generate flashcards from");
      }

      // Generate flashcards with metadata
      const cards = await generateFlashcards(
        textToProcess,
        settings.cardCount,
        subject,
        targetGrade
      );

      onGenerateFlashcards(cards, subject, targetGrade);
      
      // Increment the user's sets_created counter
      try {
        const userId = getOrCreateUserId();
        await fetch('/api/premium/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        // Refresh premium status
        await checkPremiumStatus();
      } catch (error) {
        console.error('Failed to increment counter:', error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate flashcards");
      setIsGenerating(false);
      setCurrentStep(2); // Go back to material step
    }
  };

  return (
    <>
      <div className="min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header with progress */}
          <div className="mb-12">
          <button
            onClick={handleBack}
            className="btn btn-ghost mb-6 px-4 py-2 font-medium rounded-full flex items-center gap-2"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: step === currentStep ? '3rem' : '2rem',
                  background: step === currentStep 
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                    : step < currentStep
                    ? 'var(--success)'
                    : 'var(--border)'
                }}
              />
            ))}
          </div>

          <h1 className="text-page-title text-center" style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {t("create_study_set")}
          </h1>
        </div>

        {/* Main content card */}
        <div className="card-elevated p-10">
          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl\" style={{ 
              background: 'var(--error-light)',
              border: '1px solid var(--error)',
              color: 'var(--error)'
            }}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* STEP 1: Choose Subject */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  {t("what_subject")}
                </h2>
                <p style={{ color: 'var(--foreground-muted)' }}>
                  {t("helps_create")}
                </p>
              </div>

              {/* Text input */}
              <div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleContinueFromStep1()}
                  placeholder={t("type_subject")}
                  className="input text-lg px-6 py-4"
                  style={{ borderRadius: 'var(--radius-lg)' }}
                  autoFocus
                />
              </div>

              {/* Quick examples */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t("choose_common")}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getSubjectExamples().map((example) => (
                    <button
                      key={example.name}
                      onClick={() => setSubject(example.name)}
                      className={`p-4 border-2 rounded-xl font-medium transition-all hover:scale-105 ${
                        subject === example.name
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-2xl mb-1">{example.emoji}</div>
                      <div className="text-sm">{example.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Continue button */}
              <button
                onClick={handleContinueFromStep1}
                disabled={!subject.trim()}
                className="btn btn-primary w-full py-4 text-lg font-bold"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                {t("continue")}
              </button>
            </div>
          )}

          {/* STEP 2: Add Learning Material */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("what_studying_from")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("add_material_for")} <span className="font-semibold text-gray-700 dark:text-gray-300">{subject}</span>
                </p>
              </div>

              {/* Material type selection */}
              {!selectedMaterial ? (
                <div className="grid grid-cols-1 gap-4">
                  {/* Notes - Recommended */}
                  <button
                    onClick={() => setSelectedMaterial("notes")}
                    className="card card-hover relative p-6 text-left"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%)',
                      border: '1px solid var(--primary)'
                    }}
                  >
                    <div className="absolute -top-3 right-4 text-xs font-bold px-4 py-1.5 rounded-full" style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                      color: 'var(--primary-foreground)',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      {t("recommended")}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">📝</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("notes")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          {t("paste_notes")}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* PDF/DOCX */}
                  <button
                    onClick={() => {
                      if (!isPremium) {
                        setShowPremiumModal(true);
                      } else {
                        setSelectedMaterial("pdf");
                      }
                    }}
                    className="card card-hover p-6 text-left relative"
                  >
                    {!isPremium && (
                      <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Premium
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">📄</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("pdf_document")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          {t("upload_file")}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* YouTube */}
                  <button
                    onClick={() => {
                      if (!isPremium) {
                        setShowPremiumModal(true);
                      } else {
                        setSelectedMaterial("youtube");
                      }
                    }}
                    className="card card-hover p-6 text-left relative"
                  >
                    {!isPremium && (
                      <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Premium
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">📺</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("youtube_video")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          {t("learn_from_video")}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Image */}
                  <button
                    onClick={() => {
                      if (!isPremium) {
                        setShowPremiumModal(true);
                      } else {
                        setSelectedMaterial("image");
                      }
                    }}
                    className="card card-hover p-6 text-left relative"
                  >
                    {!isPremium && (
                      <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Premium
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🖼️</div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t("image")}</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                          {t("upload_image_ocr")}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <>
                  {/* Material input area */}
                  <div className="space-y-4">
                    {/* Show selected type */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {selectedMaterial === "notes" && "📝"}
                          {selectedMaterial === "pdf" && "📄"}
                          {selectedMaterial === "youtube" && "📺"}
                          {selectedMaterial === "image" && "🖼️"}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedMaterial === "notes" && t("notes")}
                          {selectedMaterial === "pdf" && t("pdf_document")}
                          {selectedMaterial === "youtube" && t("youtube_video")}
                          {selectedMaterial === "image" && t("image")}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMaterial(null);
                          setTextInput("");
                          setYoutubeUrl("");
                          setUploadedFile(null);
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        {t("change")}
                      </button>
                    </div>

                    {/* Notes input */}
                    {selectedMaterial === "notes" && (
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={t("paste_notes_here")}
                        className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                        autoFocus
                      />
                    )}

                    {/* PDF upload */}
                    {selectedMaterial === "pdf" && (
                      <div>
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all bg-gray-50 dark:bg-gray-900/50"
                        >
                          {uploadedFile ? (
                            <div className="text-center">
                              <div className="text-4xl mb-2">✅</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("click_to_change")}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📤</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {t("click_to_upload")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("pdf_or_docx")}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}

                    {/* YouTube input */}
                    {selectedMaterial === "youtube" && (
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                        autoFocus
                      />
                    )}

                    {/* Image upload */}
                    {selectedMaterial === "image" && (
                      <div>
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all bg-gray-50 dark:bg-gray-900/50"
                        >
                          {uploadedFile ? (
                            <div className="text-center">
                              <div className="text-4xl mb-2">✅</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {uploadedFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {textInput.length > 0 ? `${textInput.length} ${t("characters_extracted")}` : t("processing")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("click_to_change")}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📷</div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {t("click_to_upload_image")}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t("jpg_png_formats")}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Continue button */}
                  <button
                    onClick={handleContinueFromStep2}
                    className="btn btn-primary w-full py-4 text-lg font-bold"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                  >
                    {t("continue")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Choose Grade */}
          {currentStep === 3 && (
            <div className="space-y-8">
              {/* Math mode selection (only for math subjects) */}
              {isMathSubject() && (
                <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    📐 {settings.language === "no" ? "Ekstra matematikkøvelse" : "Extra Math Practice"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {settings.language === "no" 
                      ? "Vil du ha regneoppgaver i tillegg til kunnskapskort?" 
                      : "Do you want calculation problems in addition to flashcards?"}
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeMathProblems}
                      onChange={(e) => setIncludeMathProblems(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {settings.language === "no" 
                        ? "Ja, inkluder regneoppgaver (anbefalt for matte)" 
                        : "Yes, include calculation problems (recommended for math)"}
                    </span>
                  </label>
                  {includeMathProblems && (
                    <p className="mt-3 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <span>💡</span>
                      <span>
                        {settings.language === "no"
                          ? "Flashcards vil fortsatt være inkludert for å hjelpe deg med teori og konsepter."
                          : "Flashcards will still be included to help you with theory and concepts."}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("what_grade_aiming")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("create_right_amount")}
                </p>
              </div>

              {/* Grade options */}
              <div className="space-y-3">
                {getGradeOptions().map(({ grade, label, description }) => (
                  <button
                    key={grade}
                    onClick={() => setTargetGrade(grade)}
                    className={`w-full p-5 border-2 rounded-2xl text-left transition-all hover:scale-[1.02] ${
                      targetGrade === grade
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 shadow-lg"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-lg font-bold mb-1 ${
                          targetGrade === grade
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-900 dark:text-white"
                        }`}>
                          {label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {description}
                        </div>
                      </div>
                      {targetGrade === grade && (
                        <div className="text-2xl">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Continue button */}
              <button
                onClick={handleContinueFromStep3}
                disabled={!targetGrade}
                className="btn btn-primary w-full py-4 text-lg font-bold"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                {t("generate_study_set")}
              </button>
            </div>
          )}

          {/* STEP 4: Generating */}
          {currentStep === 4 && (
            <div className="py-12 text-center space-y-8">
              <div className="w-20 h-20 mx-auto">
                <div className="w-full h-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("creating_study_set")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("usually_takes")}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>✨ {t("analyzing_material", { subject })}</p>
                <p>🎯 {t("creating_flashcards_grade", { grade: targetGrade || "" })}</p>
                <p>📝 {t("generating_quiz")}</p>
              </div>

              {/* Study fact */}
              <div className="max-w-lg mx-auto mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                  💡 {t("while_you_wait")}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {getStudyFact("flashcards", settings.language).text}
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
          onClose={() => setShowPremiumModal(false)}
          setsCreated={setsCreated}
        />
      )}
    </>
  );
}
