/**
 * Rate Limiting Utility
 * 
 * ANTI-ABUSE: Prevent users from creating 100 accounts to bypass limits
 * 
 * Strategy:
 * - Track by IP address (server-side)
 * - Light device fingerprinting (client-side)
 * - Progressive limits (warnings before hard blocks)
 * 
 * NOT AGGRESSIVE: We want to catch abuse, not frustrate real users
 */

import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastRequest > oneHour) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Get client IP from request
 */
export function getClientIP(req: NextRequest): string {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return "unknown";
}

/**
 * Check rate limit for AI generation
 * 
 * Now uses USER-BASED limits instead of IP-based
 * This prevents one user from blocking everyone on their IP
 * 
 * Limits (per user per day):
 * - Free users: 10 generations per day (was too strict at 5/hour)
 * - Premium users: Unlimited (essentially)
 * - Anonymous users: 3 per day (to prevent abuse)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 24 * 60 * 60 * 1000 // 24 hours (1 day)
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous requests
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Window expired - reset
  if (now - entry.firstRequest > windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Within window - check limit
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.firstRequest + windowMs,
    };
  }

  // Increment and allow
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.firstRequest + windowMs,
  };
}

/**
 * Get rate limit for user type
 */
export function getRateLimitForUser(isPremium: boolean, isAnonymous: boolean = false): number {
  if (isPremium) return 999; // Premium: essentially unlimited (999/day)
  if (isAnonymous) return 2; // Anonymous: very limited to prevent abuse
  return 2; // Free logged-in users: 2 per day
}

/**
 * Format reset time for display
 */
export function formatResetTime(resetAt: number): string {
  const now = Date.now();
  const diff = resetAt - now;

  if (diff <= 0) return "now";

  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}
