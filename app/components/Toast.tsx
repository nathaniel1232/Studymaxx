"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️"
  };

  const colors = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/30",
      border: "border-green-500 dark:border-green-700",
      text: "text-green-800 dark:text-green-200"
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/30",
      border: "border-red-500 dark:border-red-700",
      text: "text-red-800 dark:text-red-200"
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      border: "border-blue-500 dark:border-blue-700",
      text: "text-blue-800 dark:text-blue-200"
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      border: "border-amber-500 dark:border-amber-700",
      text: "text-amber-800 dark:text-amber-200"
    }
  };

  const colorScheme = colors[type];

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div
        className={`${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} border-2 rounded-xl px-6 py-4 shadow-lg backdrop-blur-sm flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        <span className="text-2xl">{icons[type]}</span>
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 5L5 15M5 5l10 10" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
