"use client";

import { useTranslation } from "../contexts/SettingsContext";

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UpdateEntry {
  version: string;
  date: string;
  changes: string[];
}

const updates: UpdateEntry[] = [
  {
    version: "1.4.0",
    date: "January 20, 2026",
    changes: [
      "🎨 Complete UI refresh - all buttons and cards now have subtle cyan gradients",
      "🔘 Subject selection buttons redesigned with hover effects and color",
      "📦 Material cards are now more rounded and bubbly (rounded-2xl)",
      "⚡ Difficulty and card count buttons have improved visual states",
      "🌍 Language selection cards match new design system",
      "🧮 Math problems feature now premium-only (Beta)",
      "📊 Improved difficulty levels - Easy/Medium/Hard now create distinct content",
      "🔢 Math problem generator improved - generates actual calculation problems",
      "🐛 Fixed navigation bug when hitting free limit",
      "⬅️ Back button now has hover effect with cyan border"
    ]
  },
  {
    version: "1.3.1",
    date: "January 12, 2026",
    changes: [
      "Improved loading screen with real progress bar",
      "Enhanced 'Did you know?' readability (20 second display time)",
      "Better visual feedback on generation steps",
      "More accurate progress tracking",
      "Improved Settings page layout and spacing",
      "Cleaner Report a Problem modal"
    ]
  },
  {
    version: "1.3.0",
    date: "January 9, 2026",
    changes: [
      "Redesigned flashcards - 33% larger cards with bigger text",
      "Rating buttons now more prominent",
      "Share feature now works for everyone",
      "Improved share page UI",
      "Better visual feedback on interactive elements"
    ]
  },
  {
    version: "1.2.0",
    date: "January 7, 2026",
    changes: [
      "Improved flashcard generation quality",
      "Faster flashcard creation with better count guarantee",
      "Enhanced grade selection UI",
      "Real-time timer during flashcard generation",
      "Image upload now available for all users",
      "Better multiple-choice questions with similar answer options"
    ]
  },
  {
    version: "1.1.0",
    date: "January 6, 2026",
    changes: [
      "Added Stripe payment integration for Premium subscriptions",
      "Manage Subscription button now works correctly",
      "Automatic premium activation after purchase",
      "Grade-specific answer quality improvements",
      "Better handling of long-form content",
      "Fixed several generation errors"
    ]
  },
  {
    version: "1.0.0",
    date: "December 30, 2025",
    changes: [
      "Initial launch",
      "AI-powered flashcard generation",
      "Quiz mode with multiple-choice questions",
      "Dark mode support",
      "Multi-language support (English & Norwegian)",
      "Local storage for offline access"
    ]
  }
];

export default function UpdatesModal({ isOpen, onClose }: UpdatesModalProps) {
  const t = useTranslation();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="card-elevated w-full max-w-3xl max-h-[90vh] flex flex-col"
        style={{ borderRadius: 'var(--radius-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📝</span>
                What's New
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Latest updates and improvements
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Updates List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {updates.map((update, index) => (
            <div 
              key={update.version}
              className="border-l-4 border-teal-500 pl-6 pb-6 relative"
            >
              {/* Timeline dot */}
              <div className="absolute -left-2 top-0 w-4 h-4 bg-teal-500 rounded-full border-4 border-white dark:border-gray-900"></div>
              
              {/* Version header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    Version {update.version}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full">
                      Latest
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {update.date}
                </span>
              </div>

              {/* Changes */}
              <ul className="space-y-2">
                {update.changes.map((change, i) => (
                  <li 
                    key={i}
                    className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-teal-500 mt-0.5">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Thanks for using StudyMaxx. We're always working to make it better.
          </p>
        </div>
      </div>
    </div>
  );
}
