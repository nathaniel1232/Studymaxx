/**
 * Stripe Customer Portal
 * Allows users to manage subscription (cancel, update payment, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY not configured");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Admin client for bypassing RLS to read user data securely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Get the authenticated user
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // No-op
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get user's Stripe customer ID from database
    const { data: userData, error: dbError } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (dbError) {
      console.error("Database error fetching user:", dbError);
    }

    if (!userData?.stripe_customer_id) {
      console.error("No usage stripe_customer_id for user:", user.id);
      
      // Fallback: Try to find customer by email in Stripe directly
      if (user.email) {
         console.log("Attempting lookup by email:", user.email);
         const customers = await stripe.customers.list({
             email: user.email,
             limit: 1
         });
         
         if (customers.data.length > 0) {
             const customerId = customers.data[0].id;
             console.log("Found customer in Stripe:", customerId);
             
             // Update database while we are at it
             await supabaseAdmin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
             
             const origin = request.headers.get("origin") || "http://localhost:3000";
             const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${origin}/`,
             });
             return NextResponse.json({ url: portalSession.url });
         }
      }

      return NextResponse.json(
        { error: "No active subscription found. Please upgrade first." },
        { status: 404 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // 3. Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${origin}/`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}
