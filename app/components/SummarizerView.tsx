"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSettings, getLanguageName } from "../contexts/SettingsContext";

interface SummarizerViewProps {
  onBack: () => void;
  isPremium: boolean;
  user?: any;
}

type SummaryLength = "short" | "medium" | "long";
type SourceType = "text" | "pdf" | "youtube" | "website";

interface SavedSummary {
  id: string;
  title: string;
  summary: string;
  source_type: SourceType;
  created_at: string;
}

// ── Icons ────────────────────────────────────────
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const NotesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <circle cx="12" cy="12" r="10" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const SOURCE_TABS: { id: SourceType; label: string; Icon: React.FC }[] = [
  { id: "text", label: "Notes", Icon: NotesIcon },
  { id: "pdf", label: "PDF / PPTX", Icon: FileIcon },
  { id: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { id: "website", label: "Website", Icon: GlobeIcon },
];

const LENGTH_OPTIONS: { value: SummaryLength; label: string; desc: string }[] = [
  { value: "short", label: "Quick", desc: "30 sec read" },
  { value: "medium", label: "Standard", desc: "2 min read" },
  { value: "long", label: "Detailed", desc: "5 min read" },
];

const FREE_DAILY_LIMIT = 2;
const ACCENT = "#06b6d4";

export default function SummarizerView({ onBack, isPremium, user }: SummarizerViewProps) {
  const { settings } = useSettings();
  const isDark = settings.theme === "dark" ||
    (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // ── state ──────────────────────────────────
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [inputText, setInputText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [length, setLength] = useState<SummaryLength>("medium");

  const [summary, setSummary] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── load saved summaries from Supabase ─────
  const loadSavedSummaries = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingSaved(true);
    try {
      const res = await fetch(`/api/summaries?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSavedSummaries(data.summaries || []);
      }
    } catch { /* ignore */ }
    finally { setIsLoadingSaved(false); }
  }, [user]);

  useEffect(() => { loadSavedSummaries(); }, [loadSavedSummaries]);

  // ── usage tracking (localStorage) ─────────
  const getDailyUsage = useCallback((): number => {
    const key = `summarizer_daily_${user?.id || "anon"}`;
    try {
      const d = JSON.parse(localStorage.getItem(key) || "{}");
      return d.date === new Date().toDateString() ? (d.count || 0) : 0;
    } catch { return 0; }
  }, [user]);

  const incrementUsage = useCallback(() => {
    const key = `summarizer_daily_${user?.id || "anon"}`;
    const today = new Date().toDateString();
    localStorage.setItem(key, JSON.stringify({ date: today, count: getDailyUsage() + 1 }));
  }, [user, getDailyUsage]);

  const remaining = FREE_DAILY_LIMIT - getDailyUsage();

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 5000); return () => clearTimeout(t); }
  }, [error]);
  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(""), 3000); return () => clearTimeout(t); }
  }, [successMsg]);

  // ── extract helpers ────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isPremium) { setShowPremiumModal(true); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "pptx", "ppt"].includes(ext || "")) { setError("Only PDF and PPTX files are supported."); return; }
    setIsExtracting(true); setError(""); setFileName(file.name);
    try {
      const fd = new FormData(); fd.append("file", file);
      const endpoint = ext === "pdf" ? "/api/extract-pdf" : "/api/extract-pptx";
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Extraction failed"); }
      const d = await res.json();
      if (!d.text || d.text.trim().length < 30) throw new Error("Not enough text extracted.");
      setInputText(d.text);
      setSummaryTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err: any) { setError(err.message); setFileName(""); }
    finally { setIsExtracting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleYouTubeExtract = async () => {
    if (!urlInput.trim()) { setError("Please enter a YouTube URL."); return; }
    if (!isPremium) { setShowPremiumModal(true); return; }
    setIsExtracting(true); setError("");
    try {
      const res = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to get transcript"); }
      const d = await res.json();
      const transcript = d.transcript || d.text;
      if (!transcript || transcript.trim().length < 30) throw new Error("Transcript too short or unavailable.");
      setInputText(transcript);
      setSummaryTitle(d.title || "YouTube Video");
    } catch (err: any) { setError(err.message); }
    finally { setIsExtracting(false); }
  };

  const handleWebsiteExtract = async () => {
    if (!urlInput.trim()) { setError("Please enter a URL."); return; }
    if (!isPremium) { setShowPremiumModal(true); return; }
    setIsExtracting(true); setError("");
    try {
      const res = await fetch("/api/extract-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to extract website"); }
      const d = await res.json();
      if (!d.text || d.text.trim().length < 30) throw new Error("Not enough content on this page.");
      setInputText(d.text);
      setSummaryTitle(d.title || new URL(urlInput.trim()).hostname);
    } catch (err: any) { setError(err.message); }
    finally { setIsExtracting(false); }
  };

  // ── summarize ──────────────────────────────
  const handleSummarize = async () => {
    if (!inputText.trim() || inputText.trim().length < 50) { setError("Please enter at least 50 characters."); return; }
    if (!isPremium && sourceType === "text" && remaining <= 0) { setShowPremiumModal(true); return; }
    if (!isPremium && sourceType !== "text") { setShowPremiumModal(true); return; }

    setIsSummarizing(true); setError("");
    try {
      console.log('[Summarizer] Starting summarization request...');
      console.log('[Summarizer] Output language:', settings.language, '→', getLanguageName(settings.language));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      let res: Response;
      try {
        res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText, length, sourceType, outputLanguage: settings.language }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          throw new Error('Summarization took too long. Try selecting "Short" length or pasting less text.');
        }
        throw fetchErr;
      }
      clearTimeout(timeout);
      
      console.log('[Summarizer] Response status:', res.status, res.statusText);
      
      // Check content type before parsing
      const contentType = res.headers.get('content-type');
      console.log('[Summarizer] Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await res.text();
        console.error('[Summarizer] Non-JSON response:', textResponse.substring(0, 500));
        throw new Error('Server returned non-JSON response. This usually means the OpenAI API is not configured correctly. Check your OPENAI_API_KEY environment variable in Vercel.');
      }
      
      let d;
      try {
        d = await res.json();
      } catch (jsonErr) {
        console.error('[Summarizer] JSON parse error:', jsonErr);
        throw new Error('Server returned an invalid response. This may be a timeout. Try "Short" length or less text.');
      }
      
      if (!res.ok) {
        console.error('[Summarizer] API error:', d);
        throw new Error(d.error || "Failed to summarize");
      }
      
      if (!d.summary) {
        console.error('[Summarizer] No summary in response:', d);
        throw new Error('Server returned empty summary');
      }
      
      console.log('[Summarizer] ✅ Summary generated successfully');
      setSummary(d.summary);

      // Extract title from first line
      const firstLine = d.summary.split("\n")[0]?.trim() || "";
      if (firstLine.length > 2) setSummaryTitle(firstLine);

      if (!isPremium && sourceType === "text") incrementUsage();

      // Auto-save to Supabase
      if (user?.id) autoSave(d.summary, firstLine);
    } catch (err: any) {
      console.error('[Summarizer] Error:', err);
      setError(err.message || 'Failed to generate summary. Check browser console for details.');
    }
    finally { setIsSummarizing(false); }
  };

  // ── Supabase save/delete ───────────────────
  const autoSave = async (summaryText: string, title: string) => {
    if (!user?.id || !summaryText.trim()) {
      console.log('[Summarizer] Cannot auto-save: missing user or summary', { hasUser: !!user?.id, summaryLength: summaryText?.length });
      return;
    }
    setIsSaving(true);
    try {
      console.log('[Summarizer] Attempting to save summary...', { userId: user.id, titleLength: title?.length, summaryLength: summaryText?.length });
      const res = await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: title || "Untitled", summary: summaryText, sourceType }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Summarizer] Save failed with status:', res.status, errorData);
        setError(`Failed to save: ${errorData.error || 'Please run the summaries schema in Supabase'}`);
        return;
      }
      
      const data = await res.json();
      console.log('[Summarizer] ✅ Save successful:', data);
      if (data.summary) {
        setSavedSummaries(prev => [data.summary, ...prev].slice(0, 50));
        setSuccessMsg("Saved to My Summaries!");
      }
    } catch (err: any) {
      console.error('[Summarizer] Save error:', err);
      setError(`Save failed: ${err.message || 'Check console for details'}`);
    }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSavedSummaries(prev => prev.filter(s => s.id !== id));
    if (user?.id) {
      try {
        await fetch("/api/summaries", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, userId: user.id }),
        });
      } catch { /* ignore */ }
    }
  };

  const handleLoad = (s: SavedSummary) => {
    setSummary(s.summary);
    setSummaryTitle(s.title);
    setShowSaved(false);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  const handleReset = () => {
    setInputText(""); setSummary(""); setUrlInput(""); setFileName("");
    setSummaryTitle(""); setError("");
  };

  // ── colors ─────────────────────────────────
  const bg = isDark ? "#0f0f1a" : "#f8fafc";
  const card = isDark ? "#1a1a2e" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const text1 = isDark ? "#e8eaed" : "#0f172a";
  const text2 = isDark ? "#94a3b8" : "#64748b";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9";

  // ── render a single summary line ───────────
  const renderLine = (line: string, i: number) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} style={{ height: "10px" }} />;

    const startsWithEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(trimmed);

    // Main title (first line with emoji)
    if (i === 0 && startsWithEmoji) return (
      <h1 key={i} style={{ fontSize: "22px", fontWeight: 700, color: text1, margin: "0 0 16px", lineHeight: 1.3 }}>
        {trimmed}
      </h1>
    );

    // Section headers with emoji
    const isSectionHeader = startsWithEmoji && !trimmed.startsWith("\u2022") && trimmed.length < 80;
    const isTextHeader = /^(Brief Overview|Key Points|Quick Summary|Kort oppsummering|Viktige punkter|Kort oversikt|N\u00f8kkelpunkter)/i.test(trimmed);
    if (isSectionHeader || isTextHeader) return (
      <h2 key={i} style={{
        fontSize: "17px", fontWeight: 700, color: text1,
        margin: "20px 0 8px", paddingBottom: "4px",
        borderBottom: `1.5px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}>{trimmed}</h2>
    );

    // Bullet points
    if (trimmed.startsWith("\u2022") || trimmed.startsWith("- ") || trimmed.startsWith("\u2013 ")) {
      const content = trimmed.replace(/^[\u2022\-\u2013]\s*/, "");
      return (
        <div key={i} style={{ display: "flex", gap: "8px", margin: "5px 0", paddingLeft: "4px" }}>
          <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0 }}>{"\u2022"}</span>
          <span style={{ color: text1, fontSize: "14px", lineHeight: "1.65" }}>{content}</span>
        </div>
      );
    }

    // Numbered items
    if (/^\d+[\.\)]\s/.test(trimmed)) return (
      <p key={i} style={{ color: text1, fontSize: "14px", lineHeight: "1.65", margin: "4px 0", paddingLeft: "4px" }}>
        {trimmed}
      </p>
    );

    // Separator
    if (trimmed === "---" || trimmed === "\u2014") return (
      <hr key={i} style={{ border: "none", borderTop: `1px solid ${border}`, margin: "12px 0" }} />
    );

    // Regular text
    return (
      <p key={i} style={{ color: text2, fontSize: "14px", lineHeight: "1.65", margin: "4px 0" }}>
        {trimmed}
      </p>
    );
  };

  // ── RENDER ─────────────────────────────────
  return (
    <div style={{ backgroundColor: bg, minHeight: "100vh", fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{
        backgroundColor: card, borderBottom: `1px solid ${border}`,
        padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{ color: text2, background: "none", border: "none", cursor: "pointer", display: "flex" }}>
          <BackIcon />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <h1 style={{ color: text1, fontSize: "20px", fontWeight: 700, margin: 0 }}>Summarizer</h1>
        </div>
        <button
          onClick={() => { setShowSaved(!showSaved); if (!showSaved) loadSavedSummaries(); }}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 500,
            border: `1px solid ${showSaved ? ACCENT : border}`,
            background: showSaved ? `${ACCENT}18` : "transparent",
            color: showSaved ? ACCENT : text2, cursor: "pointer",
          }}
        >
          <SaveIcon />
          Saved ({savedSummaries.length})
        </button>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Saved Summaries drawer */}
        {showSaved && (
          <div style={{
            backgroundColor: card, border: `1px solid ${border}`, borderRadius: "16px",
            padding: "20px", marginBottom: "20px",
          }}>
            <h3 style={{ color: text1, fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>
              Saved Summaries
            </h3>
            {isLoadingSaved ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0", color: ACCENT }}><SpinnerIcon /></div>
            ) : savedSummaries.length === 0 ? (
              <p style={{ color: text2, fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                No saved summaries yet. They&apos;ll appear here automatically.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
                {savedSummaries.map((s) => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                    borderRadius: "10px", backgroundColor: inputBg, cursor: "pointer", transition: "background 0.15s",
                  }}
                    onClick={() => handleLoad(s)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = inputBg)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: text1, fontSize: "14px", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.title}
                      </p>
                      <p style={{ color: text2, fontSize: "12px", margin: "2px 0 0" }}>
                        {new Date(s.created_at).toLocaleDateString()} &middot; {s.source_type}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", opacity: 0.6 }}
                      title="Delete"
                    ><TrashIcon /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Input Section ─── */}
        {!summary && (
          <>
            {/* Source tabs */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${SOURCE_TABS.length}, 1fr)`, gap: "8px", marginBottom: "20px" }}>
              {SOURCE_TABS.map((tab) => (
                <button key={tab.id}
                  onClick={() => { setSourceType(tab.id); setInputText(""); setUrlInput(""); setFileName(""); setError(""); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                    padding: "14px 8px", borderRadius: "14px", cursor: "pointer",
                    border: `2px solid ${sourceType === tab.id ? ACCENT : border}`,
                    backgroundColor: sourceType === tab.id ? `${ACCENT}12` : card,
                    color: sourceType === tab.id ? ACCENT : text2, transition: "all 0.2s",
                  }}
                >
                  <tab.Icon />
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{tab.label}</span>
                  {!isPremium && tab.id !== "text" && (
                    <span style={{ fontSize: "10px", opacity: 0.6 }}>Premium</span>
                  )}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div style={{ backgroundColor: card, border: `1px solid ${border}`, borderRadius: "16px", padding: "24px", marginBottom: "16px" }}>
              {/* TEXT */}
              {sourceType === "text" && (
                <>
                  <textarea
                    value={inputText} onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your notes here..."
                    style={{
                      width: "100%", minHeight: "180px", padding: "16px", borderRadius: "12px",
                      border: `1px solid ${border}`, backgroundColor: inputBg, color: text1,
                      fontSize: "14px", lineHeight: "1.6", resize: "vertical", outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                    <span style={{ color: text2, fontSize: "12px" }}>{inputText.length.toLocaleString()} chars</span>
                    {!isPremium && (
                      <span style={{ color: remaining > 0 ? text2 : "#ef4444", fontSize: "12px" }}>
                        {remaining} free left today
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* PDF / PPTX */}
              {sourceType === "pdf" && (
                <>
                  <input ref={fileInputRef} type="file" accept=".pdf,.pptx,.ppt" onChange={handleFileUpload} style={{ display: "none" }} />
                  {isExtracting ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "40px 0", color: ACCENT }}>
                      <SpinnerIcon /> Extracting text from {fileName}...
                    </div>
                  ) : inputText ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <FileIcon />
                        <span style={{ color: text1, fontWeight: 500, fontSize: "14px" }}>{fileName}</span>
                        <button onClick={() => { setInputText(""); setFileName(""); }}
                          style={{ marginLeft: "auto", background: "none", border: "none", color: text2, cursor: "pointer", fontSize: "13px" }}>Change</button>
                      </div>
                      <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: inputBg, maxHeight: "150px", overflowY: "auto", fontSize: "13px", color: text2, lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {inputText.slice(0, 600)}{inputText.length > 600 ? "..." : ""}
                      </div>
                    </>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      style={{ width: "100%", padding: "40px 24px", borderRadius: "14px", border: `2px dashed ${border}`, background: "transparent", cursor: "pointer", textAlign: "center", color: text2 }}>
                      <div style={{ marginBottom: "8px" }}><FileIcon /></div>
                      <p style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 4px", color: text1 }}>Upload PDF or PowerPoint</p>
                      <p style={{ fontSize: "13px", margin: 0 }}>Click to browse (.pdf, .pptx)</p>
                    </button>
                  )}
                </>
              )}

              {/* YouTube */}
              {sourceType === "youtube" && (
                <>
                  {isExtracting ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "40px 0", color: ACCENT }}>
                      <SpinnerIcon /> Extracting transcript...
                    </div>
                  ) : inputText ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <YoutubeIcon />
                        <span style={{ color: text1, fontWeight: 500, fontSize: "14px" }}>{summaryTitle}</span>
                        <button onClick={() => { setInputText(""); setUrlInput(""); }}
                          style={{ marginLeft: "auto", background: "none", border: "none", color: text2, cursor: "pointer", fontSize: "13px" }}>Change</button>
                      </div>
                      <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: inputBg, maxHeight: "150px", overflowY: "auto", fontSize: "13px", color: text2, lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {inputText.slice(0, 600)}{inputText.length > 600 ? "..." : ""}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        onKeyDown={(e) => e.key === "Enter" && handleYouTubeExtract()}
                        style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: inputBg, color: text1, fontSize: "14px", outline: "none", fontFamily: "inherit" }}
                      />
                      <button onClick={handleYouTubeExtract} disabled={!urlInput.trim()}
                        style={{ padding: "12px 20px", borderRadius: "12px", border: "none", backgroundColor: ACCENT, color: "#fff", fontWeight: 600, fontSize: "14px", cursor: urlInput.trim() ? "pointer" : "not-allowed", opacity: urlInput.trim() ? 1 : 0.5 }}>
                        Extract
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Website */}
              {sourceType === "website" && (
                <>
                  {isExtracting ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "40px 0", color: ACCENT }}>
                      <SpinnerIcon /> Extracting page content...
                    </div>
                  ) : inputText ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <GlobeIcon />
                        <span style={{ color: text1, fontWeight: 500, fontSize: "14px" }}>{summaryTitle}</span>
                        <button onClick={() => { setInputText(""); setUrlInput(""); }}
                          style={{ marginLeft: "auto", background: "none", border: "none", color: text2, cursor: "pointer", fontSize: "13px" }}>Change</button>
                      </div>
                      <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: inputBg, maxHeight: "150px", overflowY: "auto", fontSize: "13px", color: text2, lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {inputText.slice(0, 600)}{inputText.length > 600 ? "..." : ""}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://en.wikipedia.org/wiki/..."
                        onKeyDown={(e) => e.key === "Enter" && handleWebsiteExtract()}
                        style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: inputBg, color: text1, fontSize: "14px", outline: "none", fontFamily: "inherit" }}
                      />
                      <button onClick={handleWebsiteExtract} disabled={!urlInput.trim()}
                        style={{ padding: "12px 20px", borderRadius: "12px", border: "none", backgroundColor: ACCENT, color: "#fff", fontWeight: 600, fontSize: "14px", cursor: urlInput.trim() ? "pointer" : "not-allowed", opacity: urlInput.trim() ? 1 : 0.5 }}>
                        Extract
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Length selector */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {LENGTH_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setLength(o.value)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: "12px", cursor: "pointer",
                    border: `2px solid ${length === o.value ? ACCENT : border}`,
                    backgroundColor: length === o.value ? `${ACCENT}12` : card,
                    color: length === o.value ? ACCENT : text2, textAlign: "center", transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{o.label}</div>
                  <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>{o.desc}</div>
                </button>
              ))}
            </div>

            {/* Summarize button */}
            <button onClick={handleSummarize}
              disabled={isSummarizing || inputText.trim().length < 50 || isExtracting}
              style={{
                width: "100%", padding: "16px", borderRadius: "14px", border: "none",
                background: isSummarizing ? `${ACCENT}88` : `linear-gradient(135deg, ${ACCENT}, #0891b2)`,
                color: "#fff", fontSize: "16px", fontWeight: 700,
                cursor: (isSummarizing || inputText.trim().length < 50) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                opacity: inputText.trim().length < 50 ? 0.5 : 1,
                boxShadow: `0 4px 14px ${ACCENT}44`, transition: "all 0.2s",
              }}
            >
              {isSummarizing ? <><SpinnerIcon /> Summarizing...</> : "Summarize"}
            </button>
          </>
        )}

        {/* Error / Success */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "14px", marginBottom: "16px", fontWeight: 500, marginTop: summary ? "0" : "16px" }}>{error}</div>
        )}
        {successMsg && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: "14px", marginBottom: "16px", fontWeight: 500 }}>{successMsg}</div>
        )}

        {/* ══════════ SUMMARY VIEW ══════════ */}
        {summary && (
          <div style={{ marginBottom: "24px" }}>
            {/* Top bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderRadius: "14px 14px 0 0",
              backgroundColor: isDark ? "#16213e" : "#e0f2fe", flexWrap: "wrap", gap: "8px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isSaving && <SpinnerIcon />}
                <span style={{ color: text2, fontSize: "12px" }}>{isSaving ? "Saving..." : "Auto-saved"}</span>
              </div>
              <button onClick={handleCopy}
                style={{
                  padding: "6px 12px", borderRadius: "8px", border: `1px solid ${border}`,
                  background: card, color: copied ? "#22c55e" : text2, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500,
                }}>
                <CopyIcon /> {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Summary content - EDITABLE */}
            <textarea
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                // Auto-save on edit
                if (user?.id && summaryTitle) {
                  const timeoutId = setTimeout(() => autoSave(e.target.value, summaryTitle), 1500);
                  return () => clearTimeout(timeoutId);
                }
              }}
              style={{
                width: "100%", minHeight: "500px", padding: "24px 28px",
                backgroundColor: card, border: `1px solid ${border}`, borderTop: "none",
                borderRadius: "0 0 14px 14px",
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.06)",
                color: text1, fontSize: "15px", lineHeight: "1.8", resize: "vertical",
                outline: "none", fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                whiteSpace: "pre-wrap",
              }}
            />

            {/* Bottom action */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
              <button onClick={handleReset}
                style={{ padding: "10px 20px", borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: card, color: text2, cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                New Summary
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowPremiumModal(false)} />
          <div style={{
            position: "relative", width: "100%", maxWidth: "420px", borderRadius: "20px", padding: "32px",
            backgroundColor: card, border: `1px solid ${border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", textAlign: "center",
          }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 style={{ color: text1, fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>Premium Feature</h3>
            <p style={{ color: text2, fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
              {sourceType === "text"
                ? "You've used your 2 free summaries today. Upgrade for unlimited!"
                : "YouTube, websites, and file uploads require Premium. Free users get 2 text summaries per day."}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowPremiumModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${border}`, backgroundColor: "transparent", color: text2, cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
                Later
              </button>
              <button onClick={() => { window.location.href = "/pricing"; }}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: `linear-gradient(135deg, ${ACCENT}, #0891b2)`, color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
