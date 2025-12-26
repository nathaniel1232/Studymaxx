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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
      <div 
        className="card-elevated max-w-lg w-full p-8 relative animate-scale-in"
        style={{ borderRadius: 'var(--radius-2xl)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-4xl">
            ⭐
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          {t("upgrade_to_premium")}
        </h2>

        {/* Description */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          {customMessage || t("free_limit_reached")}
        </p>

        {!customMessage && (
          <>
            {/* Stats */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
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

        {/* Features */}
        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t("premium_includes")}:
          </h3>
          
          <div className="space-y-2">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {customMessage && (
          <div className="mb-6">
            <div className="space-y-2">
              {features.slice(0, 5).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Premium Explanation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <div className="text-xl">💡</div>
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <strong>{t("why_premium")}</strong> {t("ai_costs_money")}
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 mb-4">
          <div className="flex gap-3 items-start">
            <div className="text-2xl">🚀</div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                Premium lanseres snart!
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                Vi jobber med å integrere betalingsløsningen. Premium vil være tilgjengelig om kort tid med månedlig abonnement for kun <strong>49 kr/måned</strong>.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                💌 Vil du bli varslet når Premium er klart? Send en e-post til <a href="mailto:studymaxxer@gmail.com" className="underline font-medium">studymaxxer@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          className="w-full py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold rounded-xl shadow-lg text-lg cursor-not-allowed opacity-75"
          disabled
        >
          Kommer snart...
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
        >
          Lukk
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
