/**
 * Manual Premium Activation Endpoint
 * Called client-side after Stripe checkout redirect to ?premium=success
 * Uses service role key to bypass RLS and update user premium status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials not configured (need SERVICE_ROLE_KEY)");
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Use service role key to bypass RLS for premium activation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Secondary client for auth verification only
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Verify token and get user (use auth client, not service role)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;

    console.log(`[Premium Activate] User: ${userId} (${userEmail})`);

    // Find the user's Stripe customer by searching with the email
    let stripeCustomerId: string | null = null;
    let activeSubscription: any = null;
    let hasActiveSubscription = false;
    
    try {
      // List all customers to find ones matching this email
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 100
      });
      
      console.log(`[Premium Activate] Found ${customers.data.length} customers for email: ${userEmail}`);
      
      // Check each customer for active subscriptions
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          console.log(`[Premium Activate] Found subscription for customer ${customer.id}: status=${sub.status}`);
          
          if (sub.status === 'active' || sub.status === 'trialing') {
            stripeCustomerId = customer.id;
            activeSubscription = sub;
            hasActiveSubscription = true;
            console.log(`[Premium Activate] ✅ Active subscription found: ${sub.id}`);
            break;
          }
        }
      }
    } catch (err: any) {
      console.error('[Premium Activate] Failed to fetch Stripe customer:', err);
      return NextResponse.json({
        error: 'Failed to verify payment status',
        details: err.message
      }, { status: 500 });
    }

    // Only activate if they have a Stripe subscription
    if (!hasActiveSubscription) {
      console.log(`[Premium Activate] ❌ No active subscription found for ${userEmail}`);
      return NextResponse.json({
        error: 'No active subscription found. Please complete payment first.',
        premium: false
      }, { status: 402 });
    }

    // Calculate expiration from subscription
    const subData = activeSubscription as any;
    const premiumExpiresAt = subData?.current_period_end
      ? new Date(subData.current_period_end * 1000).toISOString()
      : null;

    // Check if user exists in users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, is_premium")
      .eq("id", userId)
      .single();

    const updateData = {
      is_premium: true,
      email: userEmail,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: activeSubscription?.id || null,
      subscription_tier: 'premium',
      premium_expires_at: premiumExpiresAt,
    };

    if (existingUser) {
      // Update existing user to Premium
      console.log(`[Premium Activate] Updating user ${userId} to premium`);
      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

      if (error) {
        console.error("[Premium Activate] ❌ Failed to update user:", error);
        return NextResponse.json({ 
          error: 'Failed to activate Premium',
          details: error.message 
        }, { status: 500 });
      }

      console.log(`[Premium Activate] ✅ User ${userId} (${userEmail}) activated as Premium until ${premiumExpiresAt}`);
    } else {
      // Create new user as Premium
      console.log(`[Premium Activate] Creating new user ${userId} as Premium`);
      const { error } = await supabase
        .from("users")
        .insert({
          id: userId,
          ...updateData,
        });

      if (error) {
        console.error("[Premium Activate] ❌ Failed to create user:", error);
        return NextResponse.json({ 
          error: 'Failed to create Premium user',
          details: error.message 
        }, { status: 500 });
      }

      console.log(`[Premium Activate] ✅ User ${userId} (${userEmail}) created as Premium until ${premiumExpiresAt}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Premium activated! Please refresh the page.',
      isPremium: true
    });

  } catch (error: any) {
    console.error('[Premium Activate] ❌ Catch block error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
