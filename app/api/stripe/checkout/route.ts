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

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Detect user's country from request (for currency)
    // Try Cloudflare header first, then fallback to parsing Accept-Language
    const country = req.headers.get("cf-ipcountry") || 
                    req.headers.get("x-vercel-ip-country") ||
                    "NO"; // Default to Norway

    // Map country to currency and price
    const currencyMap: { [key: string]: { currency: string; amount: number } } = {
      // Nordic countries - NOK
      "NO": { currency: "nok", amount: 3900 }, // 39 NOK
      "SE": { currency: "sek", amount: 4500 }, // ~39 NOK
      "DK": { currency: "dkk", amount: 3400 }, // ~39 NOK
      
      // Eurozone
      "AT": { currency: "eur", amount: 390 }, // 3.90 EUR
      "BE": { currency: "eur", amount: 390 },
      "DE": { currency: "eur", amount: 390 },
      "ES": { currency: "eur", amount: 390 },
      "FI": { currency: "eur", amount: 390 },
      "FR": { currency: "eur", amount: 390 },
      "IE": { currency: "eur", amount: 390 },
      "IT": { currency: "eur", amount: 390 },
      "NL": { currency: "eur", amount: 390 },
      "PT": { currency: "eur", amount: 390 },
      
      // UK
      "GB": { currency: "gbp", amount: 340 }, // ~39 NOK
      
      // USA & Americas
      "US": { currency: "usd", amount: 399 }, // $3.99
      "CA": { currency: "cad", amount: 549 }, // $5.49 CAD
      
      // Other
      "AU": { currency: "aud", amount: 649 }, // $6.49 AUD
      "NZ": { currency: "nzd", amount: 699 }, // $6.99 NZD
      
      // Default fallback
      "DEFAULT": { currency: "eur", amount: 390 }
    };

    const pricing = currencyMap[country] || currencyMap["DEFAULT"];

    console.log(`[Checkout] Country: ${country}, Currency: ${pricing.currency.toUpperCase()}, Amount: ${pricing.amount / 100}`);

    // Create Stripe Checkout Session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            product_data: {
              name: "StudyMaxx Premium",
              description: "Unlimited AI flashcards, PDF/YouTube support, and more",
            },
            recurring: {
              interval: "month",
            },
            unit_amount: pricing.amount, // Amount in cents/øre
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
