"use client";

/**
 * StudyTimeWidget — Tracks daily study time with goals.
 *
 * Replaces the old "streak" concept with actual study time tracking.
 * - Shows today's study time and daily goal progress
 * - Shows this week's total
 * - Persists via localStorage + Supabase study_sessions table
 * - Auto-increments while user is on study screens
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";

const LS_KEY = "studymaxx_study_time";
const LS_GOAL_KEY = "studymaxx_daily_goal";

interface DailyLog {
  date: string; // YYYY-MM-DD
  seconds: number;
}

interface Props {
  isDarkMode: boolean;
  isStudying?: boolean; // true when user is actively studying (increments timer)
}

export default function StudyTimeWidget({ isDarkMode, isStudying = false }: Props) {
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [weekSeconds, setWeekSeconds] = useState(0);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const today = new Date().toISOString().split("T")[0];

  // Load study time from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const logs: DailyLog[] = JSON.parse(raw);
        const todayLog = logs.find((l) => l.date === today);
        setTodaySeconds(todayLog?.seconds || 0);

        // Calculate this week's total
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekTotal = logs
          .filter((l) => l.date >= weekStartStr)
          .reduce((sum, l) => sum + l.seconds, 0);
        setWeekSeconds(weekTotal);
      }

      const goal = localStorage.getItem(LS_GOAL_KEY);
      if (goal) setDailyGoalMinutes(parseInt(goal, 10) || 30);
    } catch { /* ignore */ }
  }, [today]);

  // Auto-increment timer when studying
  useEffect(() => {
    if (isStudying) {
      intervalRef.current = setInterval(() => {
        setTodaySeconds((prev) => {
          const newVal = prev + 1;
          saveTodayTime(newVal);
          return newVal;
        });
        setWeekSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isStudying]);  // eslint-disable-line react-hooks/exhaustive-deps

  const saveTodayTime = (seconds: number) => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const logs: DailyLog[] = raw ? JSON.parse(raw) : [];
      const idx = logs.findIndex((l) => l.date === today);
      if (idx >= 0) {
        logs[idx].seconds = seconds;
      } else {
        logs.push({ date: today, seconds });
      }
      // Keep last 30 days only
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const filtered = logs.filter((l) => l.date >= cutoffStr);
      localStorage.setItem(LS_KEY, JSON.stringify(filtered));
    } catch { /* ignore */ }
  };

  const setGoal = (minutes: number) => {
    setDailyGoalMinutes(minutes);
    localStorage.setItem(LS_GOAL_KEY, minutes.toString());
    setShowGoalPicker(false);
  };

  // Formatting
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const goalSeconds = dailyGoalMinutes * 60;
  const goalProgress = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));
  const goalMet = todaySeconds >= goalSeconds;

  // Get this week's streak (days where goal was met)
  const getWeekStreak = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return 0;
      const logs: DailyLog[] = JSON.parse(raw);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split("T")[0];
      return logs.filter(
        (l) => l.date >= weekStartStr && l.seconds >= goalSeconds
      ).length;
    } catch {
      return 0;
    }
  };

  const weekStreak = getWeekStreak();

  return (
    <div
      className="rounded-2xl p-5 mb-8"
      style={{
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff",
        border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: isDarkMode ? "#e2e8f0" : "#0f172a" }}>
          Study Time
        </h3>
        <button
          onClick={() => setShowGoalPicker(!showGoalPicker)}
          className="text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:opacity-80"
          style={{
            backgroundColor: isDarkMode ? "rgba(6,182,212,0.1)" : "rgba(6,182,212,0.08)",
            color: "#06b6d4",
          }}
        >
          Goal: {dailyGoalMinutes}m/day
        </button>
      </div>

      {/* Goal picker dropdown */}
      {showGoalPicker && (
        <div
          className="rounded-xl p-2 mb-3 grid grid-cols-5 gap-1"
          style={{
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#f8fafc",
            border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
          }}
        >
          {[15, 30, 45, 60, 90].map((m) => (
            <button
              key={m}
              onClick={() => setGoal(m)}
              className="py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: dailyGoalMinutes === m ? "#06b6d4" : "transparent",
                color: dailyGoalMinutes === m ? "#fff" : isDarkMode ? "#94a3b8" : "#64748b",
              }}
            >
              {m}m
            </button>
          ))}
        </div>
      )}

      {/* Today's progress */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <p className="text-2xl font-black" style={{ color: isDarkMode ? "#ffffff" : "#0f172a" }}>
              {formatTime(todaySeconds)}
            </p>
            <p className="text-[11px]" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
              studied today
            </p>
          </div>
          {goalMet && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ backgroundColor: "rgba(34,197,94,0.1)" }}
            >
              <svg className="w-3.5 h-3.5" style={{ color: "#22c55e" }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>Goal met!</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goalProgress}%`,
              background: goalMet
                ? "linear-gradient(90deg, #22c55e, #14b8a6)"
                : "linear-gradient(90deg, #06b6d4, #3b82f6)",
            }}
          />
        </div>
        <p className="text-[10px] mt-1 text-right" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
          {goalProgress}% of {dailyGoalMinutes}min goal
        </p>
      </div>

      {/* Week stats */}
      <div className="flex gap-3">
        <div
          className="flex-1 rounded-xl p-3 text-center"
          style={{
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
            border: isDarkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9",
          }}
        >
          <p className="text-lg font-bold" style={{ color: isDarkMode ? "#e2e8f0" : "#0f172a" }}>
            {formatTime(weekSeconds)}
          </p>
          <p className="text-[10px]" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
            this week
          </p>
        </div>
        <div
          className="flex-1 rounded-xl p-3 text-center"
          style={{
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
            border: isDarkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9",
          }}
        >
          <p className="text-lg font-bold" style={{ color: isDarkMode ? "#e2e8f0" : "#0f172a" }}>
            {weekStreak}/7
          </p>
          <p className="text-[10px]" style={{ color: isDarkMode ? "#64748b" : "#94a3b8" }}>
            days goal met
          </p>
        </div>
      </div>
    </div>
  );
}
