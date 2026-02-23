"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { generateFlashcards, Flashcard } from "../utils/flashcardGenerator";
import { saveFlashcardSet } from "../utils/storage";
import CustomizeGenerationModal, { GenerationSettings } from "./CustomizeGenerationModal";

interface AudioRecordingViewProps {
  onBack: () => void;
  onTranscriptionComplete: (text: string, subject: string) => void;
  onGenerateFlashcards?: (cards: Flashcard[], subject: string, grade: string) => void;
  onGenerateQuiz?: (questions: any[], subject: string) => void;
  onGenerateMatch?: (terms: string[], definitions: string[], subject: string) => void;
  isPremium?: boolean;
  user?: any;
  initialSubject?: string;
  onRequestLogin?: () => void;
}

interface SavedNote {
  id: string;
  subject: string;
  content: string;
  transcription: string;
  summary: string;
  timestamp: number;
  duration?: number;
}

// Icons
const FlashcardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h6" />
  </svg>
);

const QuizIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const MatchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function AudioRecordingView({ 
  onBack, 
  onTranscriptionComplete,
  onGenerateFlashcards,
  onGenerateQuiz,
  onGenerateMatch,
  isPremium,
  user,
  initialSubject = "",
  onRequestLogin
}: AudioRecordingViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Note taker state
  const [activeTab, setActiveTab] = useState<"record" | "notes" | "saved">("record");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<SavedNote | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generationType, setGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number>(0);
  
  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [pendingGenerationType, setPendingGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  // Helper function to strip HTML tags
  const stripHtmlTags = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Load saved notes on mount
  useEffect(() => {
    loadSavedNotes();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Switch to notes tab when transcription is ready
  useEffect(() => {
    if (transcription && activeTab === "record") {
      setActiveTab("notes");
    }
  }, [transcription, activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [audioUrl]);

  // Timer for generation progress
  useEffect(() => {
    if (!isGenerating || generationStartTime === 0) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating, generationStartTime]);

  const loadSavedNotes = () => {
    try {
      const notes = JSON.parse(localStorage.getItem('audioNotes') || '[]');
      setSavedNotes(notes);
    } catch {
      setSavedNotes([]);
    }
  };

  const saveNote = useCallback(() => {
    const textToSave = summary || transcription;
    if (!textToSave.trim()) return;

    try {
      const notes = JSON.parse(localStorage.getItem('audioNotes') || '[]');
      const noteId = selectedNote?.id || `note_${Date.now()}`;
      const existingIndex = notes.findIndex((n: SavedNote) => n.id === noteId);
      
      const noteData: SavedNote = {
        id: noteId,
        subject: subject || "Untitled Lecture",
        content: isEditing ? editContent : textToSave,
        transcription,
        summary,
        timestamp: Date.now(),
        duration: recordingTime || undefined,
      };

      if (existingIndex >= 0) {
        notes[existingIndex] = noteData;
      } else {
        notes.unshift(noteData);
      }

      localStorage.setItem('audioNotes', JSON.stringify(notes.slice(0, 100)));
      setSavedNotes(notes.slice(0, 100));
      setSelectedNote(noteData);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (err) {
      console.error('[NoteTaker] Failed to save:', err);
    }
  }, [summary, transcription, subject, selectedNote, isEditing, editContent, recordingTime]);

  const deleteNote = (noteId: string) => {
    try {
      const notes = JSON.parse(localStorage.getItem('audioNotes') || '[]');
      const filtered = notes.filter((n: SavedNote) => n.id !== noteId);
      localStorage.setItem('audioNotes', JSON.stringify(filtered));
      setSavedNotes(filtered);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setTranscription("");
        setSummary("");
        setSubject("");
      }
    } catch (err) {
      console.error('[NoteTaker] Failed to delete:', err);
    }
  };

  const loadNote = (note: SavedNote) => {
    setSelectedNote(note);
    setTranscription(note.transcription);
    setSummary(note.content || note.summary);
    setSubject(note.subject);
    setEditContent(note.content || note.summary);
    setActiveTab("notes");
  };

  // Auto-save when content changes
  useEffect(() => {
    if (!transcription && !summary) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 5000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [transcription, summary, subject, editContent, saveNote]);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
        } 
      });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
      
      const options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 64000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        setAudioLevel(0);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access and try again.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscription("");
    setSummary("");
    setEditContent("");
    setChatMessages([]);
    setSelectedNote(null);
    setIsEditing(false);
    setActiveTab("record");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setError('Please upload an audio file (MP3, WAV, M4A, etc.)'); return; }
    if (file.size > 25 * 1024 * 1024) { setError('File is too large. Maximum size is 25MB.'); return; }
    setError("");
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    if (!isPremium) {
      const trialUsed = localStorage.getItem(`upload_trial_used_${user?.id || 'anon'}`) === 'true';
      if (trialUsed) {
        setError("You've used your free upload trial. Upgrade to Premium for unlimited audio recordings!");
        return;
      }
    }
    
    setIsTranscribing(true);
    setTranscribeProgress(10);
    setError("");

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      setTranscribeProgress(30);
      const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      setTranscribeProgress(70);

      if (!response.ok) {
        if (response.status === 413) throw new Error('Recording is too long. Please keep recordings under 10 minutes.');
        if (response.status === 429) throw new Error('AI service is temporarily busy. Please wait 5-10 seconds and try again.');
        let errorMsg = 'Transcription failed';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch { /* non-JSON error page */ }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setTranscribeProgress(90);
      setTranscription(data.text);
      if (data.summary) {
        setSummary(data.summary);
        setEditContent(data.summary);
      }
      setTranscribeProgress(100);
      
      if (!isPremium) {
        localStorage.setItem(`upload_trial_used_${user?.id || 'anon'}`, 'true');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscribeProgress(0);
      }, 300);
    }
  };

  const handleGenerate = async (type: "flashcards" | "quiz" | "match") => {
    const textToUse = isEditing ? editContent : (summary || transcription);
    if (!textToUse.trim()) { setError("Please transcribe your recording first"); return; }
    if (textToUse.length < 50) { setError("Content too short. Please record more."); return; }
    // Guest gate
    if (!user) { onRequestLogin?.(); return; }
    setPendingGenerationType(type);
    setShowCustomizeModal(true);
    setError("");
  };

  const handleGenerateWithSettings = async (genSettings: GenerationSettings) => {
    if (!pendingGenerationType) return;
    const type = pendingGenerationType;
    const textToUse = isEditing ? editContent : (summary || transcription);
    
    setShowCustomizeModal(false);
    setIsGenerating(true);
    setGenerateProgress(15);
    setGenerationType(type);
    setError("");
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);

    try {
      const countToGenerate = type === "match" ? genSettings.matchPairs : genSettings.count;
      setGenerateProgress(40);
      const cards = await generateFlashcards(
        textToUse, countToGenerate, subject || "Lecture Notes", "B",
        user?.id || "anonymous", "notes", "auto", genSettings.difficulty,
        false, undefined, undefined
      );

      setGenerateProgress(75);
      
      if (type === "flashcards" && onGenerateFlashcards) {
        try {
          await saveFlashcardSet(subject || "Lecture Notes", cards, subject || "Lecture Notes", "B");
        } catch (saveErr) {
          console.error('[NoteTaker] Failed to auto-save:', saveErr);
        }
        setGenerateProgress(90);
        onGenerateFlashcards(cards, subject || "Lecture Notes", "B");
      } else if (type === "quiz" && onGenerateQuiz) {
        setGenerateProgress(90);
        const quizQuestions = cards.map(card => {
          const correctAnswer = card.answer;
          const otherAnswers = cards.filter(c => c.id !== card.id).map(c => c.answer).sort(() => Math.random() - 0.5).slice(0, 3);
          return { id: card.id, question: card.question, correctAnswer, options: [correctAnswer, ...otherAnswers].sort(() => Math.random() - 0.5) };
        });
        onGenerateQuiz(quizQuestions, subject || "Lecture Notes");
      } else if (type === "match" && onGenerateMatch) {
        setGenerateProgress(90);
        onGenerateMatch(cards.map(c => c.question), cards.map(c => c.answer), subject || "Lecture Notes");
      }
      setGenerateProgress(100);
    } catch (err: any) {
      setError(err.message || "Failed to generate content");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerateProgress(0);
      }, 400);
      setGenerationType(null);
      setPendingGenerationType(null);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatLoading) return;
    const userMessage = chatMessage.trim();
    setChatMessage("");
    const updatedMessages = [...chatMessages, { role: "user" as const, text: userMessage }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);
    const aiMessageIndex = updatedMessages.length;
    setChatMessages(prev => [...prev, { role: "ai" as const, text: "" }]);

    try {
      const textToUse = isEditing ? editContent : (summary || transcription);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId: user?.id || "anonymous",
          context: textToUse.substring(0, 3000),
          history: chatMessages.map(m => ({ role: m.role, text: m.text })),
        }),
      });
      if (!response.ok) throw new Error('Failed to get response');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullResponse += parsed.text;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    updated[aiMessageIndex] = { role: "ai", text: fullResponse };
                    return updated;
                  });
                }
              } catch { /* skip parse errors */ }
            }
          }
        }
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev];
        updated[aiMessageIndex] = { role: "ai", text: "Oops! Something went wrong. Please try again." };
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Color scheme
  const colors = {
    bg: isDarkMode ? '#0f1d32' : '#f8fafc',
    card: isDarkMode ? 'rgba(255,255,255,0.04)' : '#ffffff',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    textMuted: isDarkMode ? '#64748b' : '#94a3b8',
    accent: '#06b6d4',
    accentBg: isDarkMode ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  };

  return (
    <>
      <div className="min-h-screen relative" style={{ backgroundColor: colors.bg }}>
        {/* Background gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.06)' }} />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full blur-[100px]" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)' }} />
        </div>

        {/* Top bar */}
        <div className="sticky top-0 z-50 px-4 py-3 backdrop-blur-xl" style={{ backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-lg transition-all hover:scale-105" style={{ background: colors.hoverBg }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: colors.text }}>
                  <span style={{ color: colors.accent }}>AI</span> Note Taker
                </h1>
                <p className="text-xs" style={{ color: colors.textSecondary }}>Record, transcribe, study</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="sticky top-[57px] z-40 px-4 py-2 backdrop-blur-xl" style={{ backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div className="max-w-5xl mx-auto flex gap-1">
            {([
              { id: "record" as const, label: "Record", icon: "\uD83C\uDF99\uFE0F" },
              { id: "notes" as const, label: "Notes", icon: "\uD83D\uDCDD", disabled: !transcription && !selectedNote },
              { id: "saved" as const, label: `Saved (${savedNotes.length})`, icon: "\uD83D\uDCDA" },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                style={{
                  background: activeTab === tab.id ? colors.accent : 'transparent',
                  color: activeTab === tab.id ? '#fff' : colors.textSecondary,
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-6 max-w-7xl mx-auto relative">
          {/* Error message */}
          {error && (
                <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                  <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{error}</p>
                  <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-300">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {/* ============= RECORD TAB ============= */}
              {activeTab === "record" && (
                <div className="space-y-5">
                  {/* Subject input */}
                  <div className="rounded-xl p-4" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: colors.textSecondary }}>Subject / Topic</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Biology Chapter 5, History Lecture..."
                      className="w-full bg-transparent border-none outline-none text-base font-medium placeholder:opacity-40"
                      style={{ color: colors.text }}
                    />
                  </div>

                  {/* Recording section */}
                  {!audioBlob && (
                    <div className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                      {!isRecording ? (
                        <div className="space-y-5">
                          <div className="flex flex-col items-center">
                            <button
                              onClick={startRecording}
                              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-95 group"
                              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', boxShadow: '0 8px 30px rgba(6, 182, 212, 0.35)' }}
                            >
                              <svg className="w-9 h-9 group-hover:scale-110 transition-transform" fill="white" viewBox="0 0 24 24">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                              </svg>
                            </button>
                            <p className="font-semibold mt-4 text-base" style={{ color: colors.text }}>Tap to start recording</p>
                            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>Record your lecture, meeting, or study session</p>
                          </div>
                          
                          <div className="flex items-center gap-4 max-w-xs mx-auto">
                            <div className="flex-1 h-px" style={{ backgroundColor: colors.cardBorder }} />
                            <span className="text-xs font-medium" style={{ color: colors.textMuted }}>or</span>
                            <div className="flex-1 h-px" style={{ backgroundColor: colors.cardBorder }} />
                          </div>

                          <label className="block p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg"
                            style={{ background: colors.inputBg, border: `2px dashed ${colors.cardBorder}` }}
                          >
                            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                            <div className="flex items-center gap-3 justify-center">
                              <svg className="w-6 h-6" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <div className="text-left">
                                <p className="font-semibold text-sm" style={{ color: colors.text }}>Upload audio file</p>
                                <p className="text-xs" style={{ color: colors.textMuted }}>MP3, WAV, M4A &middot; Max 25MB</p>
                              </div>
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: isPaused ? '#f59e0b' : '#ef4444' }} />
                            <span className="text-3xl font-mono font-bold" style={{ color: colors.text }}>
                              {formatTime(recordingTime)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-center gap-[2px] h-16 px-4">
                            {Array.from({ length: 50 }).map((_, i) => {
                              const barHeight = Math.max(3, audioLevel * 64 * (0.4 + Math.random() * 0.6));
                              return (
                                <div key={i} className="w-[3px] rounded-full transition-all duration-75"
                                  style={{ height: `${isPaused ? 3 : barHeight}px`, backgroundColor: isPaused ? colors.textMuted : colors.accent, opacity: 0.5 + (audioLevel * 0.5) }}
                                />
                              );
                            })}
                          </div>
                          
                          <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                            {isPaused ? 'Paused' : audioLevel > 0.1 ? 'Listening...' : 'Waiting for audio...'}
                          </p>
                          
                          <div className="flex items-center justify-center gap-4">
                            {isPaused ? (
                              <button onClick={resumeRecording} className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ backgroundColor: '#22c55e' }}>
                                <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </button>
                            ) : (
                              <button onClick={pauseRecording} className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ backgroundColor: '#f59e0b' }}>
                                <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                              </button>
                            )}
                            <button onClick={stopRecording} className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg" style={{ backgroundColor: '#ef4444', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)' }}>
                              <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio preview & transcribe */}
                  {audioBlob && !transcription && (
                    <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                        <p className="text-sm font-semibold" style={{ color: colors.text }}>Recording ready</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: colors.accentBg, color: colors.accent }}>{formatTime(recordingTime)}</span>
                      </div>
                      {audioUrl && <audio controls src={audioUrl} className="w-full mb-4 rounded-lg" style={{ filter: isDarkMode ? 'invert(0.85) hue-rotate(180deg)' : 'none' }} />}
                      <div className="flex gap-2">
                        <button onClick={resetRecording} className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                          style={{ background: colors.hoverBg, color: colors.textSecondary, border: `1px solid ${colors.cardBorder}` }}
                        >Re-record</button>
                        <button onClick={transcribeAudio} disabled={isTranscribing} className="flex-[2] px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 relative overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: '#fff', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)' }}
                        >
                          {isTranscribing && (
                            <div className="absolute inset-0 bg-white/20" style={{ width: `${transcribeProgress}%`, transition: 'width 0.3s ease' }} />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {isTranscribing ? <><SpinnerIcon /> Processing...</> : 'Create AI Notes'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============= NOTES TAB ============= */}
              {activeTab === "notes" && (transcription || selectedNote) && (
                <div className="flex gap-6" style={{ height: 'calc(100vh - 114px)' }}>
                  {/* Left side - Notes Editor */}
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                    {/* Subject bar */}
                    <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Add subject..."
                        className="flex-1 bg-transparent border-none outline-none text-base font-bold placeholder:opacity-40"
                        style={{ color: colors.text }}
                      />
                      <div className="flex items-center gap-2">
                        {noteSaved && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
                            Saved
                          </span>
                        )}
                        <button onClick={saveNote} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105" style={{ background: colors.accentBg, color: colors.accent }}>
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Audio player */}
                    {audioUrl && (
                      <div className="rounded-xl p-3" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                        <audio controls src={audioUrl} className="w-full" style={{ filter: isDarkMode ? 'invert(0.85) hue-rotate(180deg)' : 'none', height: '36px' }} />
                      </div>
                    )}

                    {/* Notes content editor */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                      {/* Toolbar */}
                      <div className="px-4 py-2.5 border-b space-y-2" style={{ borderColor: colors.cardBorder }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {summary && transcription && (
                              <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.cardBorder}` }}>
                                <button
                                  onClick={() => { setIsEditing(false); setEditContent(stripHtmlTags(summary)); }}
                                  className="px-3 py-1.5 text-xs font-semibold transition-all"
                                  style={{ background: !isEditing ? colors.accent : 'transparent', color: !isEditing ? '#fff' : colors.textSecondary }}
                                >Summary</button>
                                <button
                                  onClick={() => { setIsEditing(false); setEditContent(stripHtmlTags(transcription)); }}
                                  className="px-3 py-1.5 text-xs font-semibold transition-all"
                                  style={{ color: colors.textSecondary }}
                                >Full Text</button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditContent(stripHtmlTags(summary || transcription)); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: isEditing ? 'rgba(6, 182, 212, 0.15)' : colors.hoverBg, color: isEditing ? colors.accent : colors.textSecondary }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              {isEditing ? 'Editing' : 'Edit'}
                            </button>
                            <button onClick={resetRecording} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: colors.hoverBg, color: colors.textSecondary }}>
                              New
                            </button>
                          </div>
                        </div>
                        {/* Text Formatting Toolbar - only show when editing */}
                        {isEditing && (
                          <div className="flex items-center gap-1 py-2 border-t" style={{ borderColor: colors.cardBorder }}>
                            <button
                              onClick={() => {
                                const textarea = editorRef.current;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const selectedText = editContent.substring(start, end);
                                  if (selectedText) {
                                    const newText = editContent.substring(0, start) + `**${selectedText}**` + editContent.substring(end);
                                    setEditContent(newText);
                                  }
                                }
                              }}
                              className="p-2 rounded hover:bg-opacity-80 transition-all" 
                              style={{ background: colors.hoverBg }}
                              title="Bold"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                const textarea = editorRef.current;
                                if (textarea) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const selectedText = editContent.substring(start, end);
                                  if (selectedText) {
                                    const newText = editContent.substring(0, start) + `*${selectedText}*` + editContent.substring(end);
                                    setEditContent(newText);
                                  }
                                }
                              }}
                              className="p-2 rounded hover:bg-opacity-80 transition-all"
                              style={{ background: colors.hoverBg }}
                              title="Italic"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
                              </svg>
                            </button>
                            <div className="w-px h-6 mx-1" style={{ background: colors.cardBorder }} />
                            <select
                              onChange={(e) => {
                                const textarea = editorRef.current;
                                if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const selectedText = editContent.substring(start, end);
                                  const heading = e.target.value;
                                  if (selectedText && heading) {
                                    const newText = editContent.substring(0, start) + `<${heading}>${selectedText}</${heading}>` + editContent.substring(end);
                                    setEditContent(newText);
                                  }
                                }
                                e.target.value = '';
                              }}
                              className="px-2 py-1 rounded text-xs" 
                              style={{ background: colors.hoverBg, color: colors.text, border: 'none', outline: 'none' }}
                            >
                              <option value="">Heading</option>
                              <option value="h2">H2</option>
                              <option value="h3">H3</option>
                            </select>
                            <span className="text-xs ml-auto" style={{ color: colors.textMuted }}>Select text to format</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 sm:p-6">
                        {isEditing ? (
                          <textarea
                            ref={editorRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full min-h-[500px] bg-transparent border-none outline-none resize-y text-sm leading-7"
                            style={{ color: colors.text }}
                            placeholder="Edit your notes here..."
                          />
                        ) : (
                          <div
                            className="prose prose-sm max-w-none min-h-[400px] text-sm leading-7"
                            style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}
                            dangerouslySetInnerHTML={{ 
                              __html: (summary || transcription)
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right sidebar - Actions & AI Chat */}
                  <div className="hidden lg:flex w-80 flex-col sticky top-0 h-full" style={{ borderLeft: `1px solid ${colors.cardBorder}`, backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.5)' : 'rgba(241, 245, 249, 0.95)' }}>
                    {/* Create Section */}
                    <div className="p-4 border-b" style={{ borderColor: colors.cardBorder }}>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>
                        Create from Notes
                      </h3>
                      
                      <button
                        onClick={() => handleGenerate("flashcards")}
                        disabled={isGenerating || !subject.trim()}
                        className="w-full px-4 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                        style={{
                          background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                          color: "#ffffff",
                          boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                        }}
                      >
                        {isGenerating ? <SpinnerIcon /> : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                          </svg>
                        )}
                        Create Study Set
                      </button>
                      
                      <p className="text-xs mt-3 text-center" style={{ color: isDarkMode ? "#9aa0a6" : "#475569" }}>
                        Generates flashcards, quiz & match in one set
                      </p>
                    </div>

                    {/* AI Chat Section */}
                    <div className="flex-1 flex flex-col">
                      <div className="p-4 border-b" style={{ borderColor: colors.cardBorder }}>
                        <h3 className="text-base font-bold" style={{ color: colors.text }}>
                          StudyMaxx AI
                        </h3>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          Ask questions about your notes
                        </p>
                      </div>
                      
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(26, 115, 232, 0.1)" }}>
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            </div>
                            <p className="font-medium mb-1" style={{ color: colors.text }}>
                              Ask me anything about your notes!
                            </p>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                              "Summarize this" • "Explain the main points"
                            </p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i} className="flex gap-3 items-start">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                style={{
                                  backgroundColor: msg.role === "user" ? "#1a73e8" : isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)",
                                  color: msg.role === "user" ? "#ffffff" : "#1a73e8"
                                }}
                              >
                                {msg.role === "user" ? "You" : "AI"}
                              </div>
                              
                              <div className="flex-1 space-y-1">
                                <div className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                                  {msg.role === "user" ? "You" : "StudyMaxx AI"}
                                </div>
                                <div className="text-sm leading-relaxed" style={{ color: colors.text }}>
                                  {msg.text || '...'}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      
                      {/* Chat Input */}
                      <div className="p-4 border-t" style={{ borderColor: colors.cardBorder }}>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: colors.inputBg, border: `1px solid ${colors.cardBorder}` }}>
                          <input
                            type="text"
                            placeholder="Type a question here or type '@' to reference documents..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                            className="flex-1 outline-none text-xs bg-transparent"
                            style={{ color: colors.text }}
                          />
                          <button onClick={handleChatSubmit} disabled={isChatLoading || !chatMessage.trim()} className="p-1.5 rounded-lg transition-all hover:scale-110 disabled:opacity-40" style={{ color: colors.accent }}>
                            {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============= SAVED TAB ============= */}
              {activeTab === "saved" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: colors.text }}>Saved Notes</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: colors.accentBg, color: colors.accent }}>
                      {savedNotes.length} notes
                    </span>
                  </div>
                  
                  {savedNotes.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                      <div className="text-4xl mb-4">📝</div>
                      <h3 className="font-semibold mb-2" style={{ color: colors.text }}>No saved notes yet</h3>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>Record a lecture and your notes will appear here</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {savedNotes.map((note) => (
                        <div
                          key={note.id}
                          className="group rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md"
                          style={{ background: colors.card, border: `1px solid ${selectedNote?.id === note.id ? colors.accent : colors.cardBorder}` }}
                          onClick={() => loadNote(note)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base mb-1 truncate" style={{ color: colors.text }}>{note.subject}</h3>
                              <p className="text-xs mb-2 line-clamp-2" style={{ color: colors.textSecondary }}>
                                {note.content?.replace(/<[^>]*>/g, '').substring(0, 120)}...
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-xs" style={{ color: colors.textMuted }}>{formatDate(note.timestamp)}</span>
                                {note.duration && note.duration > 0 && <span className="text-xs" style={{ color: colors.textMuted }}>{formatTime(note.duration)}</span>}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
                              title="Delete"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
        </div>

        {/* Mobile AI Chat */}
        {transcription && activeTab === "notes" && (
          <div className="lg:hidden">
            <button onClick={() => setShowAIChat(true)} className="fixed bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50" style={{ backgroundColor: colors.accent, boxShadow: '0 8px 30px rgba(6, 182, 212, 0.35)' }}>
              <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            {showAIChat && (
              <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 max-h-[60vh] rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col" style={{ background: isDarkMode ? 'rgba(15, 29, 50, 0.97)' : 'rgba(255,255,255,0.97)', border: `1px solid ${colors.cardBorder}`, backdropFilter: 'blur(20px)' }}>
                <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
                  <h4 className="font-bold text-sm" style={{ color: colors.text }}>StudyMaxx AI</h4>
                  <button onClick={() => setShowAIChat(false)} className="p-1 rounded" style={{ color: colors.textSecondary }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[40vh]">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm" style={{ color: colors.textSecondary }}>Ask me about your notes</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%] px-3 py-2 rounded-lg text-xs"
                        style={{ background: msg.role === 'user' ? colors.accent : colors.hoverBg, color: msg.role === 'user' ? '#fff' : colors.text }}
                      >{msg.text || '...'}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t" style={{ borderColor: colors.cardBorder }}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: colors.inputBg, border: `1px solid ${colors.cardBorder}` }}>
                    <input type="text" placeholder="Ask..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()} className="flex-1 outline-none text-sm bg-transparent" style={{ color: colors.text }} />
                    <button onClick={handleChatSubmit} disabled={isChatLoading || !chatMessage.trim()} className="p-1 disabled:opacity-40" style={{ color: colors.accent }}>
                      {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="text-center max-w-sm w-full mx-4 p-8 rounded-2xl" style={{ backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.95)' : 'rgba(255,255,255,0.95)' }}>
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              Creating your study set...
            </h3>
            <p className="text-sm mb-5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              This usually takes 10-30 seconds
            </p>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs font-medium mb-1.5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                <span>{elapsedSeconds < 10 ? 'Analyzing...' : elapsedSeconds < 25 ? 'Generating...' : 'Finalizing...'}</span>
                <span>{Math.min(Math.round((elapsedSeconds / 35) * 100), 95)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min((elapsedSeconds / 35) * 100, 95)}%`,
                    background: 'linear-gradient(90deg, #06b6d4, #a855f7, #06b6d4)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2 text-left">
              {[
                { label: 'Analyzing content', time: 0 },
                { label: 'Generating flashcards', time: 10 },
                { label: 'Finalizing study set', time: 25 },
              ].map((step, i) => {
                const isDone = elapsedSeconds >= [10, 25, 60][i];
                const isActive = elapsedSeconds >= step.time && !isDone;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300" style={{
                    backgroundColor: isActive ? (isDarkMode ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.05)') : 'transparent',
                  }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{
                      backgroundColor: isDone ? '#22c55e' : isActive ? '#06b6d4' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                      color: isDone || isActive ? '#ffffff' : (isDarkMode ? '#64748b' : '#94a3b8'),
                    }}>
                      {isDone ? '✓' : isActive ? <span className="animate-pulse">•</span> : (i + 1)}
                    </div>
                    <span className="text-sm font-medium" style={{
                      color: isDone ? '#22c55e' : isActive ? (isDarkMode ? '#ffffff' : '#000000') : (isDarkMode ? '#64748b' : '#94a3b8'),
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      <CustomizeGenerationModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        onGenerate={handleGenerateWithSettings}
        generationType={pendingGenerationType || "flashcards"}
        isGenerating={isGenerating}
        isPremium={isPremium}
        isDarkMode={isDarkMode}
      />
    </>
  );
}


