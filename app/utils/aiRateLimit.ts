/**
 * Rate limiting utilities for AI generation
 * Free users: 3 generations per day (resets at 00:01 GMT+1/CET)
 * Premium users: Unlimited
 */

interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  reason?: string;
}

const FREE_DAILY_LIMIT = 3;
const RATE_LIMIT_KEY_PREFIX = 'ai_rate_limit_';
const RATE_LIMIT_DATE_PREFIX = 'ai_rate_limit_date_';
const DEVICE_ID_KEY = 'studymaxx_device_id';

/**
 * Get or create a device ID for non-logged in users
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get the current "day" in GMT+1 timezone (CET)
 * Days reset at 00:01 GMT+1
 */
function getCurrentDayCET(): string {
  const now = new Date();
  // Convert to GMT+1 by adding 1 hour to UTC
  const cetTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
  // Subtract 1 minute so that 00:00 is still "yesterday" (reset at 00:01)
  cetTime.setMinutes(cetTime.getMinutes() - 1);
  return cetTime.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

/**
 * Get the next reset time (00:01 GMT+1)
 */
function getNextResetTime(): Date {
  const now = new Date();
  // Get tomorrow's date in CET
  const tomorrow = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // Convert to CET
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 1, 0, 0); // 00:01
  // Convert back to local time
  return new Date(tomorrow.getTime() - (1 * 60 * 60 * 1000));
}

/**
 * Check if user can generate flashcards
 */
export function checkAIRateLimit(userId: string | null, isPremium: boolean): RateLimitInfo {
  // Premium users have unlimited access
  if (isPremium) {
    return {
      allowed: true,
      remaining: -1, // Unlimited
      resetTime: getNextResetTime(),
    };
  }

  // Use userId if available, otherwise use device ID
  const effectiveId = userId || getDeviceId();
  
  // Check today's limit
  const key = `${RATE_LIMIT_KEY_PREFIX}${effectiveId}`;
  const dateKey = `${RATE_LIMIT_DATE_PREFIX}${effectiveId}`;
  
  const storedCount = localStorage.getItem(key);
  const storedDate = localStorage.getItem(dateKey);
  const currentDay = getCurrentDayCET();
  
  // If it's a new day, reset the counter
  if (storedDate !== currentDay) {
    localStorage.setItem(key, '0');
    localStorage.setItem(dateKey, currentDay);
    return {
      allowed: true,
      remaining: FREE_DAILY_LIMIT,
      resetTime: getNextResetTime(),
    };
  }
  
  const count = storedCount ? parseInt(storedCount, 10) : 0;

  if (count >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: getNextResetTime(),
      reason: 'You\'ve reached your daily limit (3/3). Upgrade to Premium for unlimited generations!',
    };
  }

  return {
    allowed: true,
    remaining: FREE_DAILY_LIMIT - count,
    resetTime: getNextResetTime(),
  };
}

/**
 * Increment the rate limit counter
 */
export function incrementAIUsage(userId: string | null): void {
  const effectiveId = userId || getDeviceId();
  
  const key = `${RATE_LIMIT_KEY_PREFIX}${effectiveId}`;
  const dateKey = `${RATE_LIMIT_DATE_PREFIX}${effectiveId}`;
  const currentDay = getCurrentDayCET();
  
  // Check if we need to reset for a new day
  const storedDate = localStorage.getItem(dateKey);
  if (storedDate !== currentDay) {
    localStorage.setItem(key, '1');
    localStorage.setItem(dateKey, currentDay);
    return;
  }
  
  const stored = localStorage.getItem(key);
  const count = stored ? parseInt(stored, 10) : 0;
  
  localStorage.setItem(key, (count + 1).toString());
}

/**
 * Get remaining generations for display
 * @returns number for programmatic use
 */
export function getRemainingGenerations(userId: string | null, isPremium: boolean): number {
  if (isPremium) {
    return 999; // Unlimited represented as high number
  }
  
  const info = checkAIRateLimit(userId, isPremium);
  return info.remaining;
}

/**
 * Clean up old rate limit entries (call this periodically)
 */
export function cleanupOldRateLimits(): void {
  const currentDay = getCurrentDayCET();
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(RATE_LIMIT_DATE_PREFIX)) {
      const storedDate = localStorage.getItem(key);
      if (storedDate !== currentDay) {
        // Remove the date key and corresponding count key
        const userId = key.replace(RATE_LIMIT_DATE_PREFIX, '');
        localStorage.removeItem(key);
        localStorage.removeItem(`${RATE_LIMIT_KEY_PREFIX}${userId}`);
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
