"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "success", onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: "✨",
    error: "⚠️",
    info: "ℹ️",
    warning: "⏱️"
  };

  const colors = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-300 dark:border-emerald-700/60",
      text: "text-emerald-900 dark:text-emerald-100",
      icon: "text-emerald-600 dark:text-emerald-400"
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/40",
      border: "border-red-300 dark:border-red-700/60",
      text: "text-red-900 dark:text-red-100",
      icon: "text-red-600 dark:text-red-400"
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-300 dark:border-blue-700/60",
      text: "text-blue-900 dark:text-blue-100",
      icon: "text-blue-600 dark:text-blue-400"
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-300 dark:border-amber-700/60",
      text: "text-amber-900 dark:text-amber-100",
      icon: "text-amber-600 dark:text-amber-400"
    }
  };

  const colorScheme = colors[type];

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right max-w-sm">
      <div
        className={`${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} border rounded-2xl px-5 py-4 shadow-lg backdrop-blur-sm flex items-start gap-3 transition-all duration-300`}
      >
        <span className={`text-xl flex-shrink-0 mt-0.5 ${colorScheme.icon}`}>{icons[type]}</span>
        <p className="flex-1 font-medium text-sm leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className={`flex-shrink-0 text-lg opacity-50 hover:opacity-100 transition-opacity mt-0.5`}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(120%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
