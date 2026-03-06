"use client";

import { useEffect, useState } from "react";

interface ExitIntentPopupProps {
  onSignUp: () => void;
  isDarkMode?: boolean;
}

export default function ExitIntentPopup({ onSignUp, isDarkMode = false }: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only fire once per session
    if (sessionStorage.getItem("studymaxx_exit_intent_shown")) return;

    // Wait 4 s before activating so it doesn't fire immediately on page load
    let ready = false;
    const readyTimer = setTimeout(() => {
      ready = true;
    }, 4000);

    const handleMouseLeave = (e: MouseEvent) => {
      // Mouse left through the top of the viewport — typical tab-close / back gesture
      if (e.clientY <= 5 && ready) {
        setIsVisible(true);
        sessionStorage.setItem("studymaxx_exit_intent_shown", "1");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(readyTimer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      onClick={() => setIsVisible(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
          animation: "exitIntentIn 0.25s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
          style={{
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#f1f5f9",
            color: "#64748b",
          }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #06b6d4, #3b82f6)" }}
        />

        <div className="px-8 py-7 text-center">
          {/* Icon */}
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(6,182,212,0.12)" }}
          >
            <svg className="w-7 h-7" style={{ color: "#06b6d4" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h2
            className="text-xl font-bold mb-2 leading-snug"
            style={{ color: isDarkMode ? "#ffffff" : "#0f172a" }}
          >
            Before you go — your notes deserve better.
          </h2>
          <p
            className="text-sm mb-6 leading-relaxed"
            style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}
          >
            Turn any notes, PDF, or YouTube video into flashcards and quizzes in 30 seconds.{" "}
            <span className="font-semibold" style={{ color: isDarkMode ? "#e2e8f0" : "#0f172a" }}>
              Free to start — no credit card needed.
            </span>
          </p>

          {/* Mini feature list */}
          <ul className="text-left space-y-2 mb-6">
            {[
              "AI flashcards from any source",
              "Quizzes, match game & study modes",
              "MathMaxx for maths problems",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm" style={{ color: isDarkMode ? "#cbd5e1" : "#334155" }}>
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#06b6d4" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              setIsVisible(false);
              onSignUp();
            }}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white mb-3 transition-all hover:scale-105 active:scale-100"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              boxShadow: "0 4px 20px rgba(6,182,212,0.4)",
            }}
          >
            Start Studying for Free →
          </button>

          <button
            onClick={() => setIsVisible(false)}
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: "#94a3b8" }}
          >
            No thanks, I'll keep struggling
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes exitIntentIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
