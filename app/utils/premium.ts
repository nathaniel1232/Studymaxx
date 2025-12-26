/**
 * Premium subscription utilities
 * Centralized logic for checking premium status and enforcing limits
 */

export interface UserPlan {
  isPremium: boolean;
  setsCreated: number;
  lastResetDate: string;
  accountId?: string;
}

export interface UsageLimits {
  maxSetsPerDay: number;
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

// Free tier limits - generous but protected
export const FREE_LIMITS: UsageLimits = {
  maxSetsPerDay: 3, // Changed from 1 to 3 - more generous for students
  maxFlashcardsPerSet: 15,
  maxAIGenerationsPerDay: 3, // Changed from 1 to 3 - allows multiple attempts
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
  maxSetsPerDay: Infinity,
  maxFlashcardsPerSet: Infinity,
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
 * Check if user can create a new study set
 */
export function canCreateSet(userPlan: UserPlan): { allowed: boolean; reason?: string } {
  if (userPlan.isPremium) {
    return { allowed: true };
  }

  // Check if daily limit exceeded
  const today = new Date().toISOString().split('T')[0];
  const lastReset = userPlan.lastResetDate?.split('T')[0];

  if (lastReset === today && userPlan.setsCreated >= FREE_LIMITS.maxSetsPerDay) {
    return {
      allowed: false,
      reason: `Free users can create ${FREE_LIMITS.maxSetsPerDay} study set per day. Upgrade to Premium for unlimited sets!`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can generate flashcards (AI usage)
 */
export function canUseAI(userPlan: UserPlan): { allowed: boolean; reason?: string } {
  if (userPlan.isPremium) {
    return { allowed: true };
  }

  const today = new Date().toISOString().split('T')[0];
  const lastReset = userPlan.lastResetDate?.split('T')[0];

  if (lastReset === today && userPlan.setsCreated >= FREE_LIMITS.maxAIGenerationsPerDay) {
    return {
      allowed: false,
      reason: `Free users can generate ${FREE_LIMITS.maxAIGenerationsPerDay} AI study set per day. Upgrade to Premium for unlimited AI generations!`,
    };
  }

  return { allowed: true };
}

/**
 * Check if flashcard count is within limits
 */
export function validateFlashcardCount(count: number, isPremium: boolean): { valid: boolean; reason?: string } {
  const limits = getUserLimits(isPremium);

  if (count > limits.maxFlashcardsPerSet) {
    return {
      valid: false,
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
): { allowed: boolean; reason?: string } {
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
    reason: `${featureNames[feature]} is a Premium feature. Upgrade to unlock!`,
  };
}

/**
 * Get premium feature list for upgrade modal
 */
export function getPremiumFeatures(): string[] {
  return [
    '✨ Unlimited study sets',
    '🤖 Unlimited AI generations',
    '📄 PDF & document uploads',
    '🎥 YouTube transcript support',
    '🖼️ Image OCR scanning',
    '🎯 Difficulty selection',
    '🔄 Flashcard regeneration',
    '☁️ Save & sync across devices',
    '🔗 Shareable study set links',
    '⚡ Priority AI quality (GPT-4o mini)',
  ];
}

/**
 * Pricing info (for future implementation)
 */
export const PRICING = {
  monthly: {
    price: 4.99,
    currency: 'USD',
    interval: 'month',
  },
  yearly: {
    price: 39.99,
    currency: 'USD',
    interval: 'year',
    savings: '33%',
  },
};
