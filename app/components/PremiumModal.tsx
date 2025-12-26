"use client";

import { useTranslation } from "../contexts/SettingsContext";
import { getPremiumFeatures } from "../utils/premium";

interface PremiumModalProps {
  onClose: () => void;
  isOpen: boolean;
  setsCreated?: number;
  customMessage?: string;
}

export default function PremiumModal({ onClose, isOpen, setsCreated = 1, customMessage }: PremiumModalProps) {
  const t = useTranslation();

  if (!isOpen) return null;

  const features = getPremiumFeatures();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="card-elevated max-w-md w-full p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: 'var(--radius-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - larger and more visible */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
          aria-label="Lukk"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 9L9 15M9 9l6 6" />
          </svg>
        </button>

        {/* Icon - smaller */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-2xl">
            ⭐
          </div>
        </div>

        {/* Title - smaller */}
        <h2 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          {t("upgrade_to_premium")}
        </h2>

        {/* Description - smaller */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          {customMessage || t("free_limit_reached")}
        </p>

        {!customMessage && (
          <>
            {/* Stats - more compact */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">{t("study_sets_created")}</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{setsCreated} / 1</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Features - more compact */}
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("premium_includes")}:
          </h3>
          
          <div className="space-y-1.5">
            {features.slice(0, 6).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {customMessage && (
          <div className="mb-4">
            <div className="space-y-1.5">
              {features.slice(0, 5).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Premium - more compact */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
          <div className="flex gap-2">
            <div className="text-lg">💡</div>
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <strong>{t("why_premium")}</strong> {t("ai_costs_money")}
            </div>
          </div>
        </div>

        {/* Coming Soon Notice - more compact */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 mb-3">
          <div className="flex gap-2 items-start">
            <div className="text-lg">🚀</div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                Premium lanseres snart!
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
                Månedlig abonnement for kun <strong>49 kr/måned</strong>.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                💌 Varsling: <a href="mailto:studymaxxer@gmail.com" className="underline font-medium">studymaxxer@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button - smaller */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all text-sm"
        >
          OK, jeg forstår
        </button>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
