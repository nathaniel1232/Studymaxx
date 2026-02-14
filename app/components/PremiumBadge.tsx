/**
 * Premium Badge Component
 * Shows "Premium" or "Locked" badges on features
 * 
 * Tone: Aspirational, not frustrating
 * Makes free users WANT premium, not feel blocked
 */

"use client";

interface PremiumBadgeProps {
  variant?: "inline" | "overlay" | "tooltip";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function PremiumBadge({ 
  variant = "inline", 
  size = "md",
  showIcon = true,
  className = "" 
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  if (variant === "overlay") {
    return (
      <div className={`absolute top-2 right-2 ${className}`}>
        <div className={`${sizeClasses[size]} bg-blue-700 text-white font-bold rounded-full shadow-md flex items-center gap-1`}>
          {showIcon && <span className="text-sm">⭐</span>}
          <span>Premium</span>
        </div>
      </div>
    );
  }

  if (variant === "tooltip") {
    return (
      <div className={`group relative inline-block ${className}`}>
        <div className={`${sizeClasses[size]} bg-blue-700 text-white font-bold rounded-full cursor-help flex items-center gap-1 shadow-md`}>
          {showIcon && <span>🔒</span>}
          <span>Premium</span>
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Available in Premium
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <span className={`${sizeClasses[size]} inline-flex items-center gap-1 bg-blue-700 text-white font-bold rounded-full shadow-md ${className}`}>
      {showIcon && <span>⭐</span>}
      <span>Premium</span>
    </span>
  );
}

/**
 * Locked Feature Card
 * Shows a feature that's locked behind premium
 * with motivational copy
 */

interface LockedFeatureProps {
  icon: string;
  title: string;
  description: string;
  comingSoon?: boolean;
  onClick?: () => void;
}

export function LockedFeature({ 
  icon, 
  title, 
  description, 
  comingSoon = false,
  onClick 
}: LockedFeatureProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md hover:border-amber-400 dark:hover:border-amber-600 transition-all group cursor-pointer bg-gray-50 dark:bg-gray-900"
    >
      {/* Premium badge */}
      <div className="absolute -top-2 -right-2">
        <PremiumBadge variant="inline" size="sm" />
      </div>

      {/* Content */}
      <div className="flex items-start gap-3 text-left">
        <div className="text-3xl opacity-50 group-hover:opacity-75 transition-opacity">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
            {title}
            {comingSoon && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            Click to unlock with Premium →
          </p>
        </div>
      </div>

      {/* Hover effect */}
      <div className="absolute inset-0 rounded-md bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </button>
  );
}

/**
 * Feature Comparison Card
 * Shows Free vs Premium side-by-side
 */

interface FeatureComparisonProps {
  onUpgrade: () => void;
}

export function FeatureComparison({ onUpgrade }: FeatureComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Free Tier */}
      <div className="p-4 border-2 border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
        <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
          Free
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-gray-700 dark:text-gray-300">1 study set total</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-gray-700 dark:text-gray-300">1 AI generation/day</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-gray-700 dark:text-gray-300">Up to 15 flashcards</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✗</span>
            <span className="text-gray-500 dark:text-gray-500 line-through">PDF uploads</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✗</span>
            <span className="text-gray-500 dark:text-gray-500 line-through">YouTube support</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✗</span>
            <span className="text-gray-500 dark:text-gray-500 line-through">Cloud sync</span>
          </li>
        </ul>
      </div>

      {/* Premium Tier */}
      <div className="relative p-4 border-2 border-amber-500 rounded-md bg-amber-50 dark:bg-amber-900/20">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
        <h3 className="text-lg font-bold mb-3 text-amber-600 dark:text-amber-400">
          Premium
        </h3>
        <ul className="space-y-2 text-sm mb-4">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="font-medium text-gray-900 dark:text-white">Unlimited study sets</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="font-medium text-gray-900 dark:text-white">Unlimited AI</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="font-medium text-gray-900 dark:text-white">Unlimited flashcards</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="font-medium text-gray-900 dark:text-white">PDF & image uploads</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="font-medium text-gray-900 dark:text-white">YouTube transcripts</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="font-medium text-gray-900 dark:text-white">Cloud sync & sharing</span>
          </li>
        </ul>
        <button
          onClick={onUpgrade}
          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all"
        >
          Ascend to Premium →
        </button>
      </div>
    </div>
  );
}

