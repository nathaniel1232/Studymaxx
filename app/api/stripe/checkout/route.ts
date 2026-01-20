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
  apiVersion: "2025-12-15.clover",
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

    // Detect user's country from request (for currency)
    // Try Cloudflare header first, then fallback to parsing Accept-Language
    const country = req.headers.get("cf-ipcountry") || 
                    req.headers.get("x-vercel-ip-country") ||
                    "NO"; // Default to Norway

    // Parse request body for interval preference
    let interval = 'month';
    try {
      const body = await req.json();
      if (body.interval === 'year') {
        interval = 'year';
      }
    } catch (e) {
      // Body might be empty, default to month
    }

    // Map country to currency and price
    // Yearly prices: ~8.3 months of monthly price (Save ~30%)
    const currencyMap: { [key: string]: { currency: string; amount: number; yearlyAmount: number } } = {
      // Nordic countries
      "NO": { currency: "nok", amount: 2900, yearlyAmount: 25000 }, // 250 NOK
      "SE": { currency: "sek", amount: 3500, yearlyAmount: 30000 },
      "DK": { currency: "dkk", amount: 2600, yearlyAmount: 22000 },
      
      // Eurozone
      "AT": { currency: "eur", amount: 299, yearlyAmount: 2500 }, // 25 EUR
      "BE": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "DE": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "ES": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "FI": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "FR": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "IE": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "IT": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "NL": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      "PT": { currency: "eur", amount: 299, yearlyAmount: 2500 },
      
      // UK
      "GB": { currency: "gbp", amount: 259, yearlyAmount: 2200 },
      
      // USA & Americas
      "US": { currency: "usd", amount: 299, yearlyAmount: 2500 }, // $25
      "CA": { currency: "cad", amount: 419, yearlyAmount: 3500 },
      
      // Other
      "AU": { currency: "aud", amount: 499, yearlyAmount: 4200 },
      "NZ": { currency: "nzd", amount: 549, yearlyAmount: 4600 },
      
      // Default fallback
      "DEFAULT": { currency: "eur", amount: 299, yearlyAmount: 2500 }
    };

    const pricing = currencyMap[country] || currencyMap["DEFAULT"];
    
    // Calculate final amount based on interval
    let finalAmount = pricing.amount;
    let description = "Unlimited AI flashcards, PDF/YouTube support, and more";
    
    if (interval === 'year') {
      finalAmount = pricing.yearlyAmount;
      description = "Yearly Plan - Best Value!";
    }

    console.log(`[Checkout] Country: ${country}, Currency: ${pricing.currency.toUpperCase()}, Interval: ${interval}, Amount: ${finalAmount / 100}`);

    // Create Stripe Checkout Session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            product_data: {
              name: `StudyMaxx Premium (${interval === 'year' ? 'Yearly' : 'Monthly'})`,
              description: description,
            },
            recurring: {
              interval: interval as 'month' | 'year',
            },
            unit_amount: finalAmount, // Amount in cents/øre
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      client_reference_id: userId, // Link to our user
      metadata: {
        userId: userId, // CRITICAL: Used by webhook to update isPremium
        country: country,
        currency: pricing.currency,
      },
      success_url: `${origin}?premium=success`,
      cancel_url: `${origin}?premium=cancelled`,
      allow_promotion_codes: true, // Allow discount codes
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
