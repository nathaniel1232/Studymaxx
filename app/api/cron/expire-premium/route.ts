/**
 * Cron Job: Expire Premium Subscriptions
 * 
 * This endpoint should be called daily (e.g., via Vercel Cron or external scheduler)
 * to check for and expire premium subscriptions that have reached their expiration date.
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-premium",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or has the correct authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Expire Premium Cron] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Expire Premium Cron] Starting premium expiration check...');

    // Find all users with premium that has expired
    const now = new Date().toISOString();
    const { data: expiredUsers, error: queryError } = await supabase
      .from('users')
      .select('id, email, premium_expires_at')
      .eq('is_premium', true)
      .neq('is_grandfathered', true)  // Never expire grandfathered (legacy plan) users
      .not('premium_expires_at', 'is', null)
      .lt('premium_expires_at', now);

    if (queryError) {
      console.error('[Expire Premium Cron] Query error:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', details: queryError },
        { status: 500 }
      );
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('[Expire Premium Cron] No expired premium subscriptions found');
      return NextResponse.json({
        success: true,
        expired: 0,
        message: 'No expired subscriptions'
      });
    }

    console.log(`[Expire Premium Cron] Found ${expiredUsers.length} expired premium users`);

    // Update all expired users
    const userIds = expiredUsers.map(u => u.id);
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_premium: false })
      .in('id', userIds);

    if (updateError) {
      console.error('[Expire Premium Cron] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update users', details: updateError },
        { status: 500 }
      );
    }

    console.log(`[Expire Premium Cron] ✅ Expired premium for ${expiredUsers.length} users`);
    expiredUsers.forEach(user => {
      console.log(`  - ${user.email} (expired: ${user.premium_expires_at})`);
    });

    return NextResponse.json({
      success: true,
      expired: expiredUsers.length,
      users: expiredUsers.map(u => ({
        email: u.email,
        expiredAt: u.premium_expires_at
      }))
    });

  } catch (error: any) {
    console.error('[Expire Premium Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
