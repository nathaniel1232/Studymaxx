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
  canUploadPDF: boolean;
  canUploadImages: boolean;
  canUseYouTube: boolean;
  canRegenerate: boolean;
  canSelectDifficulty: boolean;
  canSyncDevices: boolean;
  canShareSets: boolean;
}

// Free tier limits - HARD LIMITS enforced server-side
export const FREE_LIMITS: UsageLimits = {
  maxStudySets: 3, // 3 study sets per 24 hours
  maxFlashcardsPerSet: 10, // Only 10 cards for free
  maxAIGenerationsPerDay: 3, // 3 AI generations per day (was 1)
  canUploadPDF: false,
  canUploadImages: false,
  canUseYouTube: false,
  canRegenerate: false,
  canSelectDifficulty: false,
  canSyncDevices: false,
  canShareSets: false,
};

// Premium tier (unlimited)
export const PREMIUM_LIMITS: UsageLimits = {
  maxStudySets: Infinity,
  maxFlashcardsPerSet: 30, // 30 cards for premium
  maxAIGenerationsPerDay: Infinity,
  canUploadPDF: true,
  canUploadImages: true,
  canUseYouTube: true,
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
  
  // Price mapping (based on ~29 NOK)
  const prices: { [key: string]: { amount: number; symbol: string; display: string } } = {
    'NOK': { amount: 29, symbol: 'kr', display: '29 kr' },
    'SEK': { amount: 35, symbol: 'kr', display: '35 kr' },
    'DKK': { amount: 26, symbol: 'kr', display: '26 kr' },
    'EUR': { amount: 2.99, symbol: '€', display: '€2.99' },
    'USD': { amount: 2.99, symbol: '$', display: '$2.99' },
    'GBP': { amount: 2.59, symbol: '£', display: '£2.59' },
    'CAD': { amount: 4.19, symbol: '$', display: '$4.19 CAD' },
    'AUD': { amount: 4.99, symbol: '$', display: '$4.99 AUD' },
    'NZD': { amount: 5.49, symbol: '$', display: '$5.49 NZD' },
  };
  
  const pricing = prices[userCurrency] || prices['EUR'];
  
  return {
    currency: userCurrency,
    amount: pricing.amount,
    symbol: pricing.symbol,
    display: pricing.display,
    interval: 'month',
  };
}

/**
 * Pricing info - DYNAMIC based on location
 */
export const PRICING = {
  monthly: getLocalizedPricing(),
  yearly: {
    // Yearly pricing TBD
    price: 0,
    currency: 'NOK',
    interval: 'year',
    displayPrice: 'Coming soon',
  },
};

// Legacy exports for backward compatibility
export interface UserPlan {
  isPremium: boolean;
  setsCreated: number;
  lastResetDate: string;
  accountId?: string;
}

