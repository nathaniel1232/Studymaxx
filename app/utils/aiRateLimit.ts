/**
 * Rate limiting utilities for AI generation
 * Free users: 1 generation per 24 hours
 * Premium users: Unlimited
 */

interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  reason?: string;
}

const FREE_DAILY_LIMIT = 1;
const RATE_LIMIT_KEY_PREFIX = 'ai_rate_limit_';
const RATE_LIMIT_TIMESTAMP_PREFIX = 'ai_rate_limit_ts_';

/**
 * Check if user can generate flashcards
 */
export function checkAIRateLimit(userId: string | null, isPremium: boolean): RateLimitInfo {
  // Premium users have unlimited access
  if (isPremium) {
    return {
      allowed: true,
      remaining: -1, // Unlimited
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  // Non-logged in users are blocked
  if (!userId) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reason: 'Please sign in to generate flashcards',
    };
  }

  // Check logged-in free user's 24-hour limit
  const key = `${RATE_LIMIT_KEY_PREFIX}${userId}`;
  const timestampKey = `${RATE_LIMIT_TIMESTAMP_PREFIX}${userId}`;
  
  const stored = localStorage.getItem(key);
  const timestampStored = localStorage.getItem(timestampKey);
  const count = stored ? parseInt(stored, 10) : 0;
  const lastGeneration = timestampStored ? parseInt(timestampStored, 10) : 0;
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Reset if 24 hours have passed since last generation
  if (lastGeneration && (now - lastGeneration >= twentyFourHours)) {
    localStorage.removeItem(key);
    localStorage.removeItem(timestampKey);
    return {
      allowed: true,
      remaining: FREE_DAILY_LIMIT,
      resetTime: new Date(now + twentyFourHours),
    };
  }

  if (count >= FREE_DAILY_LIMIT) {
    const resetTime = new Date(lastGeneration + twentyFourHours);

    return {
      allowed: false,
      remaining: 0,
      resetTime: resetTime,
      reason: 'You\'ve used your free flashcard set for today. Upgrade to Premium for unlimited generations!',
    };
  }

  return {
    allowed: true,
    remaining: FREE_DAILY_LIMIT - count,
    resetTime: new Date(now + twentyFourHours),
  };
}

/**
 * Increment the rate limit counter and record timestamp
 */
export function incrementAIUsage(userId: string | null): void {
  if (!userId) return;

  const key = `${RATE_LIMIT_KEY_PREFIX}${userId}`;
  const timestampKey = `${RATE_LIMIT_TIMESTAMP_PREFIX}${userId}`;
  
  const stored = localStorage.getItem(key);
  const count = stored ? parseInt(stored, 10) : 0;
  
  localStorage.setItem(key, (count + 1).toString());
  localStorage.setItem(timestampKey, Date.now().toString());
}

/**
 * Get remaining generations for display
 */
export function getRemainingGenerations(userId: string | null, isPremium: boolean): string {
  const info = checkAIRateLimit(userId, isPremium);
  
  if (isPremium) {
    return 'Unlimited';
  }
  
  if (!userId) {
    return 'Sign in required';
  }
  
  return `${info.remaining} left today`;
}

/**
 * Clean up old rate limit entries (call this periodically)
 */
export function cleanupOldRateLimits(): void {
  const today = new Date().toDateString();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(RATE_LIMIT_KEY_PREFIX)) {
      // If key doesn't contain today's date, remove it
      if (!key.includes(today)) {
        localStorage.removeItem(key);
      }
    }
  }
}

function getTomorrowMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
