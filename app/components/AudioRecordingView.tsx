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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: isDarkMode ? "#0f1419" : "#f1f5f9" }}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: isDarkMode ? "#1a1f2e" : "#ffffff" }}>
        
        {/* Top Bar */}
        <div
          className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
          style={{
            backgroundColor: isDarkMode ? "rgba(26, 31, 46, 0.95)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: isDarkMode ? "none" : "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-full transition-all hover:bg-opacity-80"
              style={{
                backgroundColor: "transparent",
                color: isDarkMode ? "#9aa0a6" : "#475569",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h1 className="text-lg font-normal" style={{ color: isDarkMode ? "#e2e8f0" : "#1e293b" }}>
              Audio Notes
            </h1>
          </div>

          {transcription && (
            <button
              onClick={handleContinue}
              disabled={!subject}
              className="px-5 py-2 rounded-full font-normal text-sm flex items-center gap-2 transition-all hover:opacity-80 disabled:opacity-40"
              style={{
                backgroundColor: isDarkMode ? "#3b82f6" : "#2563eb",
                color: "#ffffff",
              }}
            >
              Continue →
            </button>
          )}
        </div>

        {/* Subject Input */}
        {transcription && (
          <div className="px-6 py-3" style={{ borderBottom: isDarkMode ? "none" : "1px solid rgba(0,0,0,0.1)" }}>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Add subject..."
              className="w-full bg-transparent border-none outline-none text-sm font-normal placeholder:text-gray-400"
              style={{ color: isDarkMode ? "#cbd5e1" : "#475569" }}
            />
          </div>
        )}

        {/* Main Recording/Content Area */}
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          {error && (
            <div className="max-w-2xl mx-auto p-4 rounded-2xl mb-6" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          {/* Recording Section */}
          {!audioBlob && !transcription && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center mb-12">
                <p className="text-base" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  Record a lecture or upload an audio file
                </p>
              </div>

              <div 
                className="p-12 rounded-3xl text-center"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', 
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                }}
              >
                {!isRecording ? (
                  <>
                    <button
                      onClick={startRecording}
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all hover:opacity-90"
                      style={{ 
                        backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
                        boxShadow: isDarkMode ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.15)' 
                      }}
                    >
                      <svg className="w-9 h-9" fill="white" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </button>
                    <p className="font-normal text-base mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Start recording</p>
                    <p className="text-sm font-normal" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Your microphone must be enabled</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444' }} />
                      <span className="text-2xl font-mono" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4">
                      {isPaused ? (
                        <button onClick={resumeRecording} className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: '#22c55e' }}>
                          <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                      ) : (
                        <button onClick={pauseRecording} className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: '#f59e0b' }}>
                          <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </button>
                      )}
                      <button onClick={stopRecording} className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: '#ef4444' }}>
                        <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                      </button>
                    </div>
                    
                    <p className="text-sm mt-4" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                      {isPaused ? 'Recording paused' : 'Recording in progress...'}
                    </p>
                    
                    <div className="mt-6 flex items-center justify-center gap-1 h-16">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const barHeight = Math.max(4, audioLevel * 60 * (0.5 + Math.random() * 0.5));
                        return (
                          <div key={i} className="w-1 rounded-full transition-all duration-100"
                            style={{ height: `${isPaused ? 4 : barHeight}px`, backgroundColor: isPaused ? '#5f6368' : '#1a73e8', opacity: 0.7 + (audioLevel * 0.3) }}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs mt-2" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                      {audioLevel > 0.1 ? '🎤 Audio detected' : '🔇 Waiting for audio...'}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
                <span className="text-sm font-normal" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
              </div>

              <label className="block p-10 rounded-3xl text-center cursor-pointer transition-all hover:bg-opacity-80"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', 
                  border: `2px dashed ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                }}
              >
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                <svg className="w-10 h-10 mx-auto mb-5" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-normal text-base mb-2" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Upload file</p>
                <p className="text-sm font-normal" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>MP3, WAV, M4A • Max 25MB</p>
              </label>
            </div>
          )}

          {/* Audio Preview & Transcribe */}
          {audioBlob && !transcription && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-8 rounded-3xl" style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff', 
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
              }}>
                <p className="text-sm mb-5 font-normal" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>Preview</p>
                {audioUrl && <audio controls src={audioUrl} className="w-full mb-6" style={{ filter: isDarkMode ? 'invert(1)' : 'none' }} />}
                <div className="flex gap-3">
                  <button onClick={resetRecording} className="flex-1 px-5 py-3 rounded-full font-normal text-sm transition-all duration-200"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f4', color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                  >Record again</button>
                  <button onClick={transcribeAudio} disabled={isTranscribing} className="flex-1 px-5 py-3 rounded-full font-normal text-sm transition-all duration-200 disabled:opacity-50 hover:opacity-90"
                    style={{ backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6', color: '#ffffff' }}
                  >{isTranscribing ? (<span className="flex items-center justify-center gap-2"><SpinnerIcon />Transcribing...</span>) : 'Create notes'}</button>
                </div>
              </div>
            </div>
          )}

          {/* Transcription Display */}
          {transcription && (
            <div className="max-w-3xl mx-auto space-y-4">
              {audioUrl && (
                <div className="p-4 rounded-2xl" style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#f1f5f9', 
                  border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.1)'
                }}>
                  <audio controls src={audioUrl} className="w-full" style={{ filter: isDarkMode ? 'invert(1)' : 'none' }} />
                </div>
              )}

              <div className="p-8 rounded-3xl" style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#ffffff', 
                border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: isDarkMode ? 'none' : '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-normal text-base" style={{ color: isDarkMode ? '#cbd5e1' : '#1e293b' }}>
                    {summary ? (useSummary ? 'Summary' : 'Transcription') : 'Transcription'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {summary && (
                      <button onClick={() => setUseSummary(!useSummary)} className="text-sm px-4 py-1.5 rounded-full transition-all font-normal"
                        style={{ 
                          backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)', 
                          color: isDarkMode ? '#60a5fa' : '#3b82f6',
                          border: isDarkMode ? 'none' : '1px solid rgba(59, 130, 246, 0.15)'
                        }}
                      >{useSummary ? 'Full text' : 'Summary'}</button>
                    )}
                    <button onClick={resetRecording} className="text-sm px-4 py-1.5 rounded-full font-normal"
                      style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)', color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                    >New</button>
                  </div>
                </div>
                <div className="max-h-[65vh] overflow-y-auto px-1 text-sm leading-7"
                  style={{ 
                    color: isDarkMode ? '#cbd5e1' : '#334155'
                  }}
                  dangerouslySetInnerHTML={{ __html: (useSummary && summary ? summary : transcription).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <div className="w-96 border-l flex flex-col"
          style={{ 
            backgroundColor: isDarkMode ? "rgba(26, 31, 46, 0.6)" : "#f1f5f9", 
            borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            backdropFilter: "blur(10px)"
          }}
        >
          <div className="p-6 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
            <h3 className="text-sm font-normal mb-4" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>Actions</h3>
            
            <div className="space-y-2">
              <button onClick={() => handleGenerate("flashcards")} disabled={isGenerating} className="w-full px-4 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:opacity-90"
                style={{ 
                  background: "linear-gradient(135deg, #1a73e8 0%, #06b6d4 100%)",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(26, 115, 232, 0.3)",
                  opacity: isGenerating && generationType === "flashcards" ? 0.8 : 1 
                }}
              >{isGenerating && generationType === "flashcards" ? <SpinnerIcon /> : <FlashcardIcon />}Create Study Set</button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
              <h3 className="text-base font-normal" style={{ color: isDarkMode ? "#cbd5e1" : "#1e293b" }}>Chat</h3>
              <p className="text-xs font-normal" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>Ask about your recording</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ backgroundColor: isDarkMode ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#60a5fa" : "#3b82f6"} strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <p className="font-normal mb-2 text-sm" style={{ color: isDarkMode ? "#cbd5e1" : "#1e293b" }}>Ask about your recording</p>
                  <p className="text-xs font-normal" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>Get summaries, explanations, and more</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-normal"
                      style={{ 
                        backgroundColor: msg.role === "user" 
                          ? (isDarkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)") 
                          : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"), 
                        color: msg.role === "user" 
                          ? (isDarkMode ? "#60a5fa" : "#3b82f6")
                          : (isDarkMode ? "#94a3b8" : "#64748b")
                      }}
                    >{msg.role === "user" ? "You" : "AI"}</div>
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-normal leading-6" style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && chatMessages[chatMessages.length - 1]?.text === "" && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: isDarkMode ? "rgba(26, 115, 232, 0.15)" : "rgba(26, 115, 232, 0.1)", color: "#1a73e8" }}>AI</div>
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-medium" style={{ color: isDarkMode ? "#9aa0a6" : "#5f6368" }}>StudyMaxx AI</div>
                    <div className="flex gap-1 py-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a73e8', animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a73e8', animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1a73e8', animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-6 border-t" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                style={{ 
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#ffffff", 
                  border: isDarkMode ? "none" : "1px solid rgba(0,0,0,0.1)" 
                }}
              >
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  placeholder="Ask a question..." 
                  className="flex-1 bg-transparent outline-none text-sm font-normal placeholder:text-gray-400" 
                  style={{ color: isDarkMode ? "#cbd5e1" : "#1e293b" }}
                />
                <button onClick={handleChatSubmit} disabled={isChatLoading || !chatMessage.trim()} className="p-1.5 rounded-lg transition-all hover:opacity-70 disabled:opacity-30" style={{ color: isDarkMode ? "#60a5fa" : "#3b82f6" }}>
                  {isChatLoading ? <SpinnerIcon /> : <SendIcon />}
                </button>
              </div>
            </div>
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
    </div>
  );
}


