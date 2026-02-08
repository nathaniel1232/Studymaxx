"use client";

import { useState } from "react";
import { useSettings } from "../contexts/SettingsContext";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { settings } = useSettings();
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isDark = settings.theme === "dark" || 
    (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError(settings.language === "no" ? "Skriv en melding" : "Please enter a message");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setMessage("");
        setEmail("");
        setType("bug");
      }, 2000);
    } catch (err) {
      setError(settings.language === "no" ? "Kunne ikke sende. Prøv igjen." : "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Modal - Cookie consent style */}
      <div 
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
        }}
      >
        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDark ? '#064e3b' : '#d1fae5' }}
            >
              <svg className="w-8 h-8" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 
              className="text-xl font-bold mb-2"
              style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            >
              {settings.language === "no" ? "Takk!" : "Thank you!"}
            </h3>
            <p 
              className="text-sm"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {settings.language === "no" 
                ? "Din tilbakemelding er sendt." 
                : "Your feedback has been submitted."}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div 
              className="p-5"
              style={{ borderBottom: isDark ? '2px solid #334155' : '2px solid #e2e8f0' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isDark ? '#1e3a5f' : '#e0f2fe' }}
                  >
                    <svg className="w-6 h-6" style={{ color: isDark ? '#38bdf8' : '#0284c7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 
                      className="text-lg font-bold"
                      style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                    >
                      {settings.language === "no" ? "Send tilbakemelding" : "Send Feedback"}
                    </h2>
                    <p 
                      className="text-xs"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      {settings.language === "no" 
                        ? "Rapporter feil eller foreslå funksjoner" 
                        : "Report bugs or suggest features"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ 
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                    color: isDark ? '#94a3b8' : '#64748b'
                  }}
                >
                  <span className="text-lg font-bold">×</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Type Selection */}
              <div>
                <label 
                  className="block text-sm font-bold mb-2"
                  style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                >
                  {settings.language === "no" ? "Type" : "Type"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "bug", label: settings.language === "no" ? "Feil" : "Bug", color: "#ef4444" },
                    { id: "feature", label: settings.language === "no" ? "Forslag" : "Feature", color: "#10b981" },
                    { id: "other", label: settings.language === "no" ? "Annet" : "Other", color: "#3b82f6" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setType(item.id as "bug" | "feature" | "other")}
                      className="p-3 rounded-lg transition-all"
                      style={{
                        backgroundColor: type === item.id 
                          ? (isDark ? `${item.color}20` : `${item.color}15`)
                          : (isDark ? '#334155' : '#f1f5f9'),
                        border: `2px solid ${type === item.id ? item.color : (isDark ? '#475569' : '#e2e8f0')}`
                      }}
                    >
                      <span 
                        className="text-sm font-bold"
                        style={{ color: type === item.id ? item.color : (isDark ? '#94a3b8' : '#64748b') }}
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label 
                  className="block text-sm font-bold mb-2"
                  style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                >
                  {settings.language === "no" ? "Melding" : "Message"} *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={settings.language === "no" 
                    ? "Beskriv problemet eller forslaget ditt..." 
                    : "Describe the issue or your suggestion..."}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg resize-none transition-all focus:outline-none"
                  style={{ 
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    border: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
                    color: isDark ? '#f1f5f9' : '#1e293b'
                  }}
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label 
                  className="block text-sm font-bold mb-2"
                  style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                >
                  {settings.language === "no" ? "E-post (valgfritt)" : "Email (optional)"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={settings.language === "no" 
                    ? "For oppfølging" 
                    : "For follow-up"}
                  className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none"
                  style={{ 
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    border: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
                    color: isDark ? '#f1f5f9' : '#1e293b'
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{error}</p>
              )}
            </div>

            {/* Footer - Cookie consent style buttons */}
            <div 
              className="p-5 flex gap-3"
              style={{ borderTop: isDark ? '2px solid #334155' : '2px solid #e2e8f0' }}
            >
              <button
                onClick={onClose}
                className="flex-1 px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  color: isDark ? '#94a3b8' : '#475569',
                  border: isDark ? '2px solid #475569' : '2px solid #cbd5e1'
                }}
              >
                {settings.language === "no" ? "Avbryt" : "Cancel"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                className="flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: isDark ? '#0ea5e9' : '#0f172a',
                  color: '#ffffff',
                  border: isDark ? '2px solid #0ea5e9' : '2px solid #0f172a'
                }}
              >
                {isSubmitting 
                  ? (settings.language === "no" ? "Sender..." : "Sending...") 
                  : (settings.language === "no" ? "Send" : "Submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

