/**
 * Premium subscription utilities - SERVER-SIDE ENFORCEMENT
 * Centralized logic for checking premium status and enforcing limits
 * CRITICAL: All checks must happen server-side to protect AI costs
 */

export interface UserStatus {
  id: string;
  isPremium: boolean;
  studySetCount: number;
  dailyAiCount: number;
  lastAiReset: Date;
  email?: string;
  accountId?: string;
}

export interface UsageLimits {
  maxStudySets: number;
  maxFlashcardsPerSet: number;
  maxAIGenerationsPerDay: number;
  maxChatMessagesPerDay: number;
  canUploadPDF: boolean;
  canUploadImages: boolean;
  canUseYouTube: boolean;
  canUseAudioRecording: boolean;
  canRegenerate: boolean;
  canSelectDifficulty: boolean;
  canSyncDevices: boolean;
  canShareSets: boolean;
}

// Free tier limits - HARD LIMITS enforced server-side
export const FREE_LIMITS: UsageLimits = {
  maxStudySets: 2, // 2 study sets per 24 hours via notes
  maxFlashcardsPerSet: 20, // Up to 20 cards for free
  maxAIGenerationsPerDay: 2, // 2 AI generations per day
  maxChatMessagesPerDay: 10, // 10 AI chat messages per day
  canUploadPDF: false, // One-time trial only
  canUploadImages: false, // One-time trial only
  canUseYouTube: true, // YouTube/website extraction is free (no AI cost)
  canUseAudioRecording: false, // One-time trial only
  canRegenerate: false,
  canSelectDifficulty: false,
  canSyncDevices: false,
  canShareSets: false,
};

// Premium tier (unlimited)
export const PREMIUM_LIMITS: UsageLimits = {
  maxStudySets: Infinity,
  maxFlashcardsPerSet: 50, // 50 cards for premium
  maxAIGenerationsPerDay: Infinity,
  maxChatMessagesPerDay: Infinity,
  canUploadPDF: true,
  canUploadImages: true,
  canUseYouTube: true,
  canUseAudioRecording: true,
  canRegenerate: true,
  canSelectDifficulty: true,
  canSyncDevices: true,
  canShareSets: true,
};

/**
 * Get user limits based on premium status
 */
export function getUserLimits(isPremium: boolean): UsageLimits {
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}

/**
 * SERVER-SIDE: Check if user needs daily AI counter reset
 * Returns true if reset was needed
 */
export function shouldResetDailyCounter(lastAiReset: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastAiReset);
  
  // Reset if different day
  return (
    now.getFullYear() !== lastReset.getFullYear() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getDate() !== lastReset.getDate()
  );
}

/**
 * SERVER-SIDE: Central function to check if user can use AI
 * This is the ONE TRUTH for AI usage permission
 * MUST be called before every AI generation
 */
export function canUseAI(userStatus: UserStatus): {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
} {
  // Premium users always allowed
  if (userStatus.isPremium) {
    return { allowed: true };
  }

  // Free users: Check daily AI limit (this resets every 24 hours)
  if (userStatus.dailyAiCount >= FREE_LIMITS.maxAIGenerationsPerDay) {
    return {
      allowed: false,
      statusCode: 429, // Too Many Requests
      reason: `Free users can create ${FREE_LIMITS.maxAIGenerationsPerDay} flashcard sets per day. Upgrade to Premium for unlimited AI generations!`,
    };
  }

  return { allowed: true };
}

/**
 * Check if flashcard count is within limits
 */
export function validateFlashcardCount(
  count: number,
  isPremium: boolean
): { valid: boolean; statusCode?: number; reason?: string } {
  const limits = getUserLimits(isPremium);

  if (count > limits.maxFlashcardsPerSet) {
    return {
      valid: false,
      statusCode: 402,
      reason: `Free users are limited to ${FREE_LIMITS.maxFlashcardsPerSet} flashcards per set. Upgrade to Premium for unlimited flashcards!`,
    };
  }

  return { valid: true };
}

/**
 * Check if user can use a specific feature
 */
export function canUseFeature(
  feature: 'pdf' | 'image' | 'youtube' | 'regenerate' | 'difficulty' | 'sync' | 'share',
  isPremium: boolean
): { allowed: boolean; statusCode?: number; reason?: string } {
  if (isPremium) {
    return { allowed: true };
  }

  const featureNames = {
    pdf: 'PDF uploads',
    image: 'image uploads',
    youtube: 'YouTube transcripts',
    regenerate: 'flashcard regeneration',
    difficulty: 'difficulty selection',
    sync: 'device sync',
    share: 'study set sharing',
  };

  return {
    allowed: false,
    statusCode: 402,
    reason: `${featureNames[feature]} is a Premium feature. Upgrade to unlock!`,
  };
}

/**
 * Get premium feature list
 */
export function getPremiumFeatures(): string[] {
  return [
    'Unlimited study sets',
    'Unlimited AI generations',
    'Image scanning (OCR)',
    'Word document uploads',
    'Difficulty targeting',
    'Regenerate flashcards',
    'Cloud sync across devices',
    'Share study sets',
    'Priority AI processing',
  ];
}

/**
 * Get short premium pitch for modals
 */
export function getPremiumPitch(): string {
  return "Premium unlocks unlimited flashcard generation, image uploads, and cloud sync.";
}

/**
 * Get motivational tagline
 */
export function getMotivationalTagline(): string {
  const taglines = [
    "Study smarter, not longer",
    "This is how top students study",
    "Turn notes into results",
    "Ascend your grades",
    "Level up your learning",
    "Maximize every study session",
  ];
  return taglines[Math.floor(Math.random() * taglines.length)];
}

/**
 * Get pricing based on user's location/currency
 * Detects currency from browser locale or defaults to EUR
 */
export function getLocalizedPricing() {
  // Detect user's locale
  let userLocale = 'en-NO'; // Default to Norway
  let userCurrency = 'NOK';
  
  if (typeof window !== 'undefined') {
    userLocale = navigator.language || 'en-NO';
    
    // Extract currency from locale
    const localeParts = userLocale.split('-');
    const country = localeParts[1] || 'NO';
    
    // Map countries to currencies
    const currencyMap: { [key: string]: string } = {
      'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK',
      'US': 'USD', 'CA': 'CAD',
      'GB': 'GBP',
      'AU': 'AUD', 'NZ': 'NZD',
      // Eurozone countries
      'AT': 'EUR', 'BE': 'EUR', 'DE': 'EUR', 'ES': 'EUR',
      'FI': 'EUR', 'FR': 'EUR', 'IE': 'EUR', 'IT': 'EUR',
      'NL': 'EUR', 'PT': 'EUR', 'GR': 'EUR', 'EE': 'EUR',
    };
    
    userCurrency = currencyMap[country] || 'EUR';
  }
  
  // Price mapping
  const prices: { [key: string]: { amount: number; symbol: string; display: string; yearlyAmount: number; yearlyDisplay: string } } = {
    'NOK': { amount: 89, symbol: 'kr', display: '89 kr', yearlyAmount: 799, yearlyDisplay: '799 kr' },
    'SEK': { amount: 99, symbol: 'kr', display: '99 kr', yearlyAmount: 899, yearlyDisplay: '899 kr' },
    'DKK': { amount: 65, symbol: 'kr', display: '65 kr', yearlyAmount: 549, yearlyDisplay: '549 kr' },
    'EUR': { amount: 8.49, symbol: '€', display: '€8.49', yearlyAmount: 74.99, yearlyDisplay: '€74.99' },
    'USD': { amount: 8.99, symbol: '$', display: '$8.99', yearlyAmount: 79.99, yearlyDisplay: '$79.99' },
    'GBP': { amount: 7.49, symbol: '£', display: '£7.49', yearlyAmount: 64.99, yearlyDisplay: '£64.99' },
    'CAD': { amount: 11.99, symbol: '$', display: '$11.99 CAD', yearlyAmount: 99.99, yearlyDisplay: '$99.99' },
    'AUD': { amount: 13.99, symbol: '$', display: '$13.99 AUD', yearlyAmount: 119.99, yearlyDisplay: '$119.99' },
    'NZD': { amount: 14.99, symbol: '$', display: '$14.99 NZD', yearlyAmount: 129.99, yearlyDisplay: '$129.99' },
  };
  
  const pricing = prices[userCurrency] || prices['EUR'];
  
  return {
    currency: userCurrency,
    amount: pricing.amount,
    symbol: pricing.symbol,
    display: pricing.display,
    interval: 'month',
    // Helpers for yearly calculation
    yearlyAmount: pricing.yearlyAmount,
    yearlyDisplay: pricing.yearlyDisplay,
    yearMonthEquiv: `${pricing.symbol}${Math.round(pricing.yearlyAmount / 12)}`,
  };
}

/**
 * Pricing info - DYNAMIC based on location
 */
export const PRICING = {
  get: getLocalizedPricing
};

// Legacy exports for backward compatibility
export interface UserPlan {
  isPremium: boolean;
  setsCreated: number;
  lastResetDate: string;
  accountId?: string;
}

