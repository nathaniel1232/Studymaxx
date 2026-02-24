"use client";

/**
 * StudyPlanWidget — Shows the user's active study plan on the dashboard.
 * 
 * Features:
 * - Auto-loads plan from Supabase API
 * - Check off completed items (persists immediately)
 * - Shows progress bar
 * - Collapsible by day
 * - Falls back to localStorage for offline use
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

interface PlanItem {
  id: string;
  day: number;
  date: string;
  title: string;
  topic: string;
  durationMinutes: number;
  type: "review" | "practice" | "quiz" | "deep_study";
  completed: boolean;
  completedAt: string | null;
}

interface StudyPlan {
  id: string;
  title: string;
  exam_date: string;
  exam_subject: string;
  daily_minutes: number;
  items: PlanItem[];
  created_at: string;
  updated_at: string;
}

interface Props {
  isPremium: boolean;
  isDarkMode: boolean;
  onRequestPremium?: () => void;
}

const LS_KEY = "studymaxx_study_plan";

export default function StudyPlanWidget({ isPremium, isDarkMode, onRequestPremium }: Props) {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  // Load plan
  useEffect(() => {
    loadPlan();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlan = async () => {
    setLoading(true);
    try {
      // Try API first
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch("/api/study-plan", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.plan) {
              setPlan(data.plan);
              // Cache locally
              try { localStorage.setItem(LS_KEY, JSON.stringify(data.plan)); } catch {}
              setLoading(false);
              // Auto-expand today
              const today = new Date().toISOString().split("T")[0];
              setExpandedDay(today);
              return;
            }
          }
        }
      }
      // Fallback to localStorage
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPlan(parsed);
        const today = new Date().toISOString().split("T")[0];
        setExpandedDay(today);
      }
    } catch {
      // Try localStorage
      try {
        const cached = localStorage.getItem(LS_KEY);
        if (cached) setPlan(JSON.parse(cached));
      } catch {}
    }
    setLoading(false);
  };

  const toggleItem = useCallback(async (itemId: string) => {
    if (!plan || updatingItem) return;
    setUpdatingItem(itemId);

    // Optimistic update
    const updatedItems = plan.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date().toISOString() : null,
        };
      }
      return item;
    });

    const updatedPlan = { ...plan, items: updatedItems };
    setPlan(updatedPlan);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updatedPlan)); } catch {}

    // Persist to API
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const target = plan.items.find(i => i.id === itemId);
          await fetch("/api/study-plan", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              planId: plan.id,
              itemId,
              completed: !target?.completed,
            }),
          });
        }
      }
    } catch (err) {
      console.warn("[StudyPlan] Failed to sync:", err);
    }
    setUpdatingItem(null);
  }, [plan, updatingItem]);

  if (loading) return null;
  if (!plan) return null;

  // Group items by date
  const grouped = plan.items.reduce<Record<string, PlanItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const totalItems = plan.items.length;
  const completedItems = plan.items.filter(i => i.completed).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const today = new Date().toISOString().split("T")[0];
  const daysUntilExam = plan.exam_date
    ? Math.max(0, Math.ceil((new Date(plan.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  const typeIcon: Record<string, string> = {
    deep_study: "📖",
    practice: "✏️",
    review: "🔄",
    quiz: "📝",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden mb-8"
      style={{
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff",
        border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
      }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: isDarkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f1f5f9" }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold" style={{ color: isDarkMode ? "#e2e8f0" : "#0f172a" }}>
              {plan.title}
            </h3>
            {daysUntilExam !== null && (
              <p className="text-xs" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
                {daysUntilExam === 0 ? "Exam is today!" : `${daysUntilExam} day${daysUntilExam !== 1 ? "s" : ""} until exam`}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: "#06b6d4" }}>{progress}%</p>
            <p className="text-[10px]" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #06b6d4, #3b82f6)" }}
          />
        </div>
      </div>

      {/* Day list */}
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(grouped).map(([date, items]) => {
          const isToday = date === today;
          const isPast = date < today;
          const isExpanded = expandedDay === date;
          const dayCompleted = items.every(i => i.completed);
          const dayLabel = isToday ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

          return (
            <div key={date}>
              <button
                onClick={() => setExpandedDay(isExpanded ? null : date)}
                className="w-full px-5 py-2.5 flex items-center justify-between text-left"
                style={{
                  backgroundColor: isToday
                    ? (isDarkMode ? "rgba(6,182,212,0.08)" : "rgba(6,182,212,0.04)")
                    : "transparent",
                  borderBottom: isDarkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid #f8fafc",
                }}
              >
                <div className="flex items-center gap-2">
                  {dayCompleted ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
                      <svg className="w-3 h-3" style={{ color: "#22c55e" }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full" style={{ border: `2px solid ${isPast ? "#ef4444" : isDarkMode ? "rgba(255,255,255,0.2)" : "#e2e8f0"}` }} />
                  )}
                  <span className={`text-sm ${isToday ? "font-bold" : "font-medium"}`} style={{ color: isDarkMode ? "#e2e8f0" : "#0f172a" }}>
                    {dayLabel}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
                      NOW
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded items */}
              {isExpanded && (
                <div className="px-5 pb-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      disabled={!!updatingItem}
                      className="w-full flex items-start gap-3 py-2 text-left group"
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                        style={{
                          backgroundColor: item.completed ? "#06b6d4" : "transparent",
                          border: item.completed ? "none" : `2px solid ${isDarkMode ? "rgba(255,255,255,0.2)" : "#cbd5e1"}`,
                        }}
                      >
                        {item.completed && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${item.completed ? "line-through" : ""}`}
                          style={{ color: item.completed ? (isDarkMode ? "#64748b" : "#94a3b8") : (isDarkMode ? "#e2e8f0" : "#0f172a") }}
                        >
                          {typeIcon[item.type] || ""} {item.title}
                        </p>
                        <p className="text-[11px]" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
                          {item.durationMinutes} min · {item.type.replace("_", " ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
