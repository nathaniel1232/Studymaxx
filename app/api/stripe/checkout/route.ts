/**
 * Stripe Checkout - Create Payment Session
 * 
 * Creates a Stripe Checkout session for Premium subscription.
 * Metadata includes userId so webhook can update database.
 * 
 * IMPORTANT: userId must be the authenticated Supabase user ID, not anonymous ID
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials not configured");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Not authenticated. Please sign in to upgrade to Premium." },
        { status: 401 }
      );
    }

    // Verify token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const email = user.email;

    // Check if user already has an active subscription to prevent double billing
    try {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 10
      });

      for (const customer of existingCustomers.data) {
        // Check both 'active' and 'trialing' to prevent double sign-ups
        const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
          stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 5 }),
          stripe.subscriptions.list({ customer: customer.id, status: 'trialing', limit: 5 }),
        ]);

        if (activeSubscriptions.data.length > 0 || trialingSubscriptions.data.length > 0) {
          const status = activeSubscriptions.data.length > 0 ? 'active' : 'trialing (free trial)';
          console.log(`[Checkout] User ${email} already has ${status} subscription`);
          return NextResponse.json(
            { 
              error: "You already have an active Premium subscription. Please visit the billing portal to manage your subscription.",
              hasActiveSubscription: true
            },
            { status: 400 }
          );
        }
      }
    } catch (err: any) {
      console.error('[Checkout] Failed to check existing subscriptions:', err);
      // Continue anyway - better to allow potential duplicate than block legitimate purchase
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Parse request body for interval preference (monthly or yearly) and promo code
    let interval = 'month';
    let promoCode: string | null = null;
    try {
      const body = await req.json();
      if (body.interval === 'year') {
        interval = 'year';
      }
      if (body.promoCode) {
        promoCode = body.promoCode;
      }
    } catch (e) {
      // Body might be empty, default to month
    }

    // Use your actual Stripe Price IDs
    const priceId = interval === 'year' 
      ? 'price_1SvZnEPDFQXMY7iph7WBuiVR'  // Yearly: $79.99/year
      : 'price_1SvZfEPDFQXMY7ipV19NzhM9'; // Monthly: $8.99/month

    console.log(`[Checkout] Creating checkout for user ${userId}, interval: ${interval}, priceId: ${priceId}${promoCode ? `, promo: ${promoCode}` : ''}`);

    // Create Stripe Checkout Session with your product Price IDs
    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId: userId, // CRITICAL: Used by webhook to update isPremium
      },
      success_url: `${origin}?premium=success`,
      cancel_url: `${origin}?premium=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      // 7-day free trial — user gets Premium access immediately, card only charged after trial
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: userId,
        },
      },
    };

    // Apply coupon if provided.
    // NOTE: cannot use allow_promotion_codes + discounts simultaneously — remove the general
    // promotion code field when a specific coupon is applied.
    if (promoCode) {
      console.log(`[Checkout] Applying coupon: ${promoCode}`);
      delete sessionParams.allow_promotion_codes;
      sessionParams.discounts = [{
        coupon: promoCode,
      }];
    }

    console.log(`[Checkout] Session params:`, JSON.stringify(sessionParams, null, 2));

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log(`[Checkout] ✅ Session created: ${session.id} with URL: ${session.url}`);

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
