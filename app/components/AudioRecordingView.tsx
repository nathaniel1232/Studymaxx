"use client";

import { useState, useRef, useEffect } from "react";
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
}

// Icons
const FlashcardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h6" />
  </svg>
);

const QuizIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const MatchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <path d="M10 6.5h4" />
    <path d="M10 17.5h4" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
  initialSubject = ""
}: AudioRecordingViewProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [useSummary, setUseSummary] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  
  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [pendingGenerationType, setPendingGenerationType] = useState<"flashcards" | "quiz" | "match" | null>(null);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-save transcription/summary to localStorage
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const textToSave = (useSummary && summary) ? summary : transcription;
    if (!textToSave.trim() || !subject) return;

    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        const savedNotes = JSON.parse(localStorage.getItem('audioNotes') || '[]');
        const existingIndex = savedNotes.findIndex((note: any) => note.subject === subject);
        
        const noteData = {
          subject,
          content: textToSave,
          transcription,
          summary,
          useSummary,
          timestamp: Date.now()
        };

        if (existingIndex >= 0) {
          savedNotes[existingIndex] = noteData;
        } else {
          savedNotes.unshift(noteData);
        }

        localStorage.setItem('audioNotes', JSON.stringify(savedNotes.slice(0, 50))); // Keep last 50
        console.log('[AudioRecording] Auto-saved:', subject);
      } catch (err) {
        console.error('[AudioRecording] Failed to auto-save:', err);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [transcription, summary, subject, useSummary]);

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
    };
  }, [audioUrl]);

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
      
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 256000
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        setAudioLevel(0);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please allow microphone access and try again.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscription("");
    setSummary("");
    setUseSummary(true);
    setChatMessages([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (MP3, WAV, M4A, etc.)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File is too large. Maximum size is 25MB.');
      return;
    }

    setError("");
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    // Paywall: free users only get 1 audio transcription
    if (!isPremium) {
      const audioUseCount = parseInt(localStorage.getItem(`audio_transcription_count_${user?.id || 'anon'}`) || '0', 10);
      if (audioUseCount >= 1) {
        setError("You've used your free audio transcription. Upgrade to Premium for unlimited recordings!");
        return;
      }
    }
    
    setIsTranscribing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rate limiting error specifically
        if (response.status === 429) {
          throw new Error('AI service is busy. Please wait a few seconds and try again.');
        }
        
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json();
      setTranscription(data.text);
      if (data.summary) {
        setSummary(data.summary);
      }
      
      // Track usage for free tier paywall
      if (!isPremium) {
        const key = `audio_transcription_count_${user?.id || 'anon'}`;
        const count = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, String(count + 1));
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerate = async (type: "flashcards" | "quiz" | "match") => {
    const textToUse = (useSummary && summary) ? summary : transcription;
    
    if (!textToUse.trim()) {
      setError("Please transcribe your recording first");
      return;
    }

    if (textToUse.length < 50) {
      setError("Transcription too short. Please record more content.");
      return;
    }

    // Open customize modal instead of generating directly
    setPendingGenerationType(type);
    setShowCustomizeModal(true);
    setError("");
  };

  const handleGenerateWithSettings = async (settings: GenerationSettings) => {
    if (!pendingGenerationType) return;
    
    const type = pendingGenerationType;
    const textToUse = (useSummary && summary) ? summary : transcription;
    
    setShowCustomizeModal(false);
    setIsGenerating(true);
    setGenerationType(type);
    setError("");

    try {
      const countToGenerate = type === "match" 
        ? settings.matchPairs 
        : settings.count;

      const cards = await generateFlashcards(
        textToUse,
        countToGenerate,
        subject || "Lecture Notes",
        "B",
        user?.id || "anonymous",
        "notes",
        "auto",
        settings.difficulty,
        false,
        undefined,
        undefined
      );

      if (type === "flashcards" && onGenerateFlashcards) {
        // Auto-save flashcards to storage
        try {
          await saveFlashcardSet(
            subject || "Lecture Notes",
            cards,
            subject || "Lecture Notes",
            "B"
          );
          console.log('[AudioRecording] ✅ Auto-saved flashcards:', cards.length);
        } catch (saveErr) {
          console.error('[AudioRecording] Failed to auto-save flashcards:', saveErr);
        }
        onGenerateFlashcards(cards, subject || "Lecture Notes", "B");
      } else if (type === "quiz" && onGenerateQuiz) {
        const quizQuestions = cards.map(card => {
          const correctAnswer = card.answer;
          const otherAnswers = cards
            .filter(c => c.id !== card.id)
            .map(c => c.answer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          
          const allOptions = [correctAnswer, ...otherAnswers]
            .sort(() => Math.random() - 0.5);
          
          return {
            id: card.id,
            question: card.question,
            correctAnswer: correctAnswer,
            options: allOptions,
          };
        });
        
        onGenerateQuiz(quizQuestions, subject || "Lecture Notes");
      } else if (type === "match" && onGenerateMatch) {
        const terms = cards.map(c => c.question);
        const definitions = cards.map(c => c.answer);
        onGenerateMatch(terms, definitions, subject || "Lecture Notes");
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(err.message || "Failed to generate content");
    } finally {
      setIsGenerating(false);
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
      const textToUse = (useSummary && summary) ? summary : transcription;
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
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullResponse += parsed.text;
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[aiMessageIndex] = { role: "ai", text: fullResponse };
                    return updated;
                  });
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[aiMessageIndex] = { 
          role: "ai", 
          text: "Oops! Something went wrong. Please try again." 
        };
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleContinue = () => {
    const textToUse = (useSummary && summary) ? summary : transcription;
    if (textToUse && subject) {
      onTranscriptionComplete(textToUse, subject);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showSidebar = !!transcription;
  const [showAIChat, setShowAIChat] = useState(true);

  return (
    <>
      <div className="min-h-screen relative" style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}>
        {/* Background gradients - matching CreateFlowView */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)' }} />
          <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full blur-[100px]" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }} />
        </div>

        {/* Top bar with logo - matching CreateFlowView */}
        <div className="sticky top-0 z-50 px-4 py-3 backdrop-blur-sm" style={{ backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.8)' : 'rgba(255, 255, 255, 0.8)', borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="text-2xl font-black" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              <span style={{ color: '#22d3ee' }}>Study</span>Maxx
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 py-4 sm:py-6 max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-4">
            <button
              onClick={onBack}
              className="mb-2 px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#000000',
                border: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            <h1 className="text-2xl md:text-3xl font-bold text-center mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              Audio Notes
            </h1>
            <p className="text-center text-sm" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Record a lecture or upload an audio file</p>
          </div>

          {/* Main content card - matching CreateFlowView card-elevated */}
          <div className="card-elevated p-3 sm:p-4">
            {/* Error message */}
            {error && (
              <div className="mb-3 p-3 rounded-lg" style={{ 
                background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#ef4444'
              }}>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Subject Input - always visible when transcription exists */}
            {transcription && (
              <div className="mb-4 p-3 rounded-lg" style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` 
              }}>
                <label className="text-xs font-semibold mb-1 block" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Add subject..."
                  className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-gray-400"
                  style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                />
              </div>
            )}

            {/* Recording Section */}
            {!audioBlob && !transcription && (
              <div className="space-y-6">
                <div 
                  className="p-8 sm:p-10 rounded-2xl text-center"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(6, 182, 212, 0.03)', 
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(6, 182, 212, 0.15)'}`,
                  }}
                >
                  {!isRecording ? (
                    <>
                      <button
                        onClick={startRecording}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all hover:scale-105"
                        style={{ 
                          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)' 
                        }}
                      >
                        <svg className="w-7 h-7 sm:w-9 sm:h-9" fill="white" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      </button>
                      <p className="font-semibold text-sm mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Start recording</p>
                      <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Your microphone must be enabled</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444' }} />
                        <span className="text-xl font-mono" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-3">
                        {isPaused ? (
                          <button onClick={resumeRecording} className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: '#22c55e' }}>
                            <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </button>
                        ) : (
                          <button onClick={pauseRecording} className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: '#f59e0b' }}>
                            <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                          </button>
                        )}
                        <button onClick={stopRecording} className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: '#ef4444' }}>
                          <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                        </button>
                      </div>
                      
                      <p className="text-xs mt-3" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                        {isPaused ? 'Recording paused' : 'Recording in progress...'}
                      </p>
                      
                      <div className="mt-4 flex items-center justify-center gap-0.5 h-12">
                        {Array.from({ length: 40 }).map((_, i) => {
                          const barHeight = Math.max(4, audioLevel * 60 * (0.5 + Math.random() * 0.5));
                          return (
                            <div key={i} className="w-1 rounded-full transition-all duration-100"
                              style={{ height: `${isPaused ? 4 : barHeight}px`, backgroundColor: isPaused ? '#5f6368' : '#06b6d4', opacity: 0.7 + (audioLevel * 0.3) }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-xs mt-1" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                        {audioLevel > 0.1 ? '🎤 Audio detected' : '🔇 Waiting for audio...'}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-xs font-medium" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>or</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
                </div>

                <label className="block p-6 sm:p-8 rounded-2xl text-center cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(6, 182, 212, 0.03)', 
                    border: `2px dashed ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(6, 182, 212, 0.2)'}`,
                  }}
                >
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  <svg className="w-8 h-8 mx-auto mb-3" style={{ color: '#06b6d4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-semibold text-sm mb-1" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Upload audio file</p>
                  <p className="text-xs" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>MP3, WAV, M4A • Max 25MB</p>
                </label>
              </div>
            )}

            {/* Audio Preview & Transcribe */}
            {audioBlob && !transcription && (
              <div className="space-y-4">
                <div className="p-4 sm:p-6 rounded-2xl" style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(6, 182, 212, 0.03)', 
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(6, 182, 212, 0.15)'}`,
                }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Preview</p>
                  {audioUrl && <audio controls src={audioUrl} className="w-full mb-4" style={{ filter: isDarkMode ? 'invert(1)' : 'none' }} />}
                  <div className="flex gap-2">
                    <button onClick={resetRecording} className="flex-1 px-4 py-2.5 rounded-md font-semibold text-sm transition-all duration-200"
                      style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDarkMode ? '#94a3b8' : '#5f6368', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                    >Record again</button>
                    <button onClick={transcribeAudio} disabled={isTranscribing} className="flex-1 px-4 py-2.5 rounded-md font-semibold text-sm transition-all duration-200 disabled:opacity-50 hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: '#ffffff', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}
                    >{isTranscribing ? (<span className="flex items-center justify-center gap-2"><SpinnerIcon />Transcribing...</span>) : 'Create notes'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Transcription Display */}
            {transcription && (
              <div className="space-y-4">
                {audioUrl && (
                  <div className="p-3 rounded-lg" style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                  }}>
                    <audio controls src={audioUrl} className="w-full" style={{ filter: isDarkMode ? 'invert(1)' : 'none' }} />
                  </div>
                )}

                <div className="p-4 sm:p-6 rounded-2xl" style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                      {summary ? (useSummary ? 'Summary' : 'Transcription') : 'Transcription'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {summary && (
                        <button onClick={() => setUseSummary(!useSummary)} className="text-xs px-3 py-1.5 rounded-md transition-all font-semibold"
                          style={{ 
                            backgroundColor: isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)', 
                            color: '#06b6d4',
                            border: '1px solid rgba(6, 182, 212, 0.2)'
                          }}
                        >{useSummary ? 'Full text' : 'Summary'}</button>
                      )}
                      <button onClick={resetRecording} className="text-xs px-3 py-1.5 rounded-md font-semibold"
                        style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDarkMode ? '#94a3b8' : '#5f6368', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                      >New</button>
                    </div>
                  </div>
                  <div className="max-h-[40vh] overflow-y-auto text-sm leading-7"
                    style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}
                    dangerouslySetInnerHTML={{ __html: (useSummary && summary ? summary : transcription).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') }}
                  />
                </div>

                {/* Create Study Set Button - matching CreateFlowView style */}
                <button 
                  onClick={() => handleGenerate("flashcards")} 
                  disabled={isGenerating || !subject.trim()}
                  className="w-full py-3 rounded-md text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', 
                    color: '#ffffff',
                    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)'
                  }}
                >
                  {isGenerating && generationType === "flashcards" ? <SpinnerIcon /> : <FlashcardIcon />}
                  <span>Create Study Set</span>
                </button>

                {/* Continue to full editor button */}
                <button
                  onClick={handleContinue}
                  disabled={!subject.trim()}
                  className="w-full py-3 rounded-md text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ 
                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', 
                    color: isDarkMode ? '#ffffff' : '#000000', 
                    border: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` 
                  }}
                >
                  <span>Continue to Editor</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* StudyMaxx AI Chat - floating widget matching DashboardView style */}
        {transcription && (
          showAIChat ? (
            <div 
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-72 sm:w-80 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(15, 29, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid rgba(6, 182, 212, 0.2)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="p-3 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>StudyMaxx AI</h4>
                  <button 
                    onClick={() => setShowAIChat(false)}
                    className="text-xs hover:text-cyan-500 transition-colors"
                    style={{ color: '#64748b' }}
                  >
                    Hide →
                  </button>
                </div>
                <p className="text-xs mt-0.5" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                  Ask about your recording
                </p>
              </div>
              <div className="p-3 flex-1 overflow-y-auto max-h-72">
                {chatMessages.length === 0 ? (
                  <div 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <input
                      type="text"
                      placeholder="Ask me anything..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                      className="flex-1 outline-none text-sm bg-transparent"
                      style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                    />
                    <button 
                      onClick={handleChatSubmit}
                      disabled={isChatLoading || !chatMessage.trim()}
                      className="p-1.5 rounded-lg transition-all duration-200 hover:bg-cyan-500/20 hover:scale-110 disabled:opacity-50"
                      style={{ color: '#06b6d4' }}
                    >
                      {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className="max-w-[80%] px-3 py-2 rounded-lg text-xs"
                            style={{
                              backgroundColor: msg.role === 'user' 
                                ? '#06b6d4' 
                                : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              color: msg.role === 'user' ? '#ffffff' : isDarkMode ? '#ffffff' : '#000000'
                            }}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isChatLoading && chatMessages[chatMessages.length - 1]?.text === "" && (
                        <div className="flex justify-start">
                          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#06b6d4', animationDelay: "0ms" }} />
                              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#06b6d4', animationDelay: "150ms" }} />
                              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#06b6d4', animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div 
                      className="flex items-center gap-2 px-3 py-2 rounded-xl sticky bottom-0"
                      style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
                    >
                      <input
                        type="text"
                        placeholder="Ask me anything..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                        className="flex-1 outline-none text-sm bg-transparent"
                        style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                      />
                      <button 
                        onClick={handleChatSubmit}
                        disabled={isChatLoading || !chatMessage.trim()}
                        className="p-1.5 rounded-lg transition-all duration-200 hover:bg-cyan-500/20 hover:scale-110 disabled:opacity-50"
                        style={{ color: '#06b6d4' }}
                      >
                        {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div ref={chatEndRef} />
            </div>
          ) : (
            <button
              onClick={() => setShowAIChat(true)}
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
              style={{ 
                backgroundColor: '#06b6d4',
                boxShadow: '0 10px 30px rgba(6, 182, 212, 0.3)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )
        )}
      </div>

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


