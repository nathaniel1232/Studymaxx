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
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 10
        });

        if (subscriptions.data.length > 0) {
          console.log(`[Checkout] User ${email} already has active subscription`);
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

    // Parse request body for interval preference (monthly or yearly)
    let interval = 'month';
    try {
      const body = await req.json();
      if (body.interval === 'year') {
        interval = 'year';
      }
    } catch (e) {
      // Body might be empty, default to month
    }

    // Use your actual Stripe Price IDs
    const priceId = interval === 'year' 
      ? 'price_1SvZnEPDFQXMY7iph7WBuiVR'  // Yearly: $79.99/year
      : 'price_1SvZfEPDFQXMY7ipV19NzhM9'; // Monthly: $8.99/month

    console.log(`[Checkout] Creating checkout for user ${userId}, interval: ${interval}, priceId: ${priceId}`);

    // Create Stripe Checkout Session with your product Price IDs
    const session = await stripe.checkout.sessions.create({
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
    });

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
