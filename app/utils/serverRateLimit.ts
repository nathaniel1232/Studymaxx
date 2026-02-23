/**
 * Simple server-side rate limiter using in-memory Map
 * Resets on server restart, but provides basic protection against abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return; // Only cleanup once per minute
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for an IP/identifier
 * @param identifier - Usually IP address or user ID
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 24 hours)
 * @returns { allowed: boolean, remaining: number }
 */
export function checkServerRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 24 * 60 * 60 * 1000
): { allowed: boolean; remaining: number } {
  cleanup();
  
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
