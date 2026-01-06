/**
 * Stripe Webhook Handler
 * MUST handle POST requests from Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Configure route for Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Main webhook handler - MUST be named POST
 */
export async function POST(request: NextRequest) {
  console.log("[Webhook] Received POST request");
  
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook] No signature found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error("[Webhook] Webhook secret not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("[Webhook] Event verified:", event.type);
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[Webhook] Checkout completed for:", session.customer_email);
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[Webhook] Subscription deleted");
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[Webhook] Subscription updated");
        await handleSubscriptionUpdated(subscription);
        break;
      }

      default:
        console.log("[Webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Webhook] Handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout
 * Set user to Premium
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id;

  if (!userId) {
    console.error("[Webhook] No userId in checkout session metadata");
    return;
  }

  console.log(`[Webhook] ✅ Checkout completed for user: ${userId}`);

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingUser) {
      // Update existing user to Premium
      const { error } = await supabase
        .from("users")
        .update({
          is_premium: true,
          email: session.customer_email,
        })
        .eq("id", userId);

      if (error) {
        console.error("[Webhook] Failed to update user to premium:", error);
      } else {
        console.log(`[Webhook] ✅ User ${userId} upgraded to Premium`);
      }
    } else {
      // Create new user as Premium
      const { error } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: session.customer_email,
          is_premium: true
        });

      if (error) {
        console.error("[Webhook] Failed to create premium user:", error);
      } else {
        console.log(`[Webhook] ✅ User ${userId} created as Premium`);
      }
    }
  } catch (error: any) {
    console.error("[Webhook] Error in handleCheckoutCompleted:", error.message);
  }
}

/**
 * Handle subscription cancellation
 * Remove Premium status
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("[Webhook] No userId in subscription metadata");
    return;
  }

  console.log(`[Webhook] ❌ Subscription cancelled for user: ${userId}`);

  try {
    const { error } = await supabase
      .from("users")
      .update({ is_premium: false })
      .eq("id", userId);

    if (error) {
      console.error("[Webhook] Failed to remove premium:", error);
    } else {
      console.log(`[Webhook] ❌ User ${userId} is no longer Premium`);
    }
  } catch (error: any) {
    console.error("[Webhook] Error in handleSubscriptionDeleted:", error.message);
  }
}

/**
 * Handle subscription updates (e.g., plan changes)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";

  try {
    const { error } = await supabase
      .from("users")
      .update({ is_premium: isActive })
      .eq("id", userId);

    if (error) {
      console.error("[Webhook] Failed to update subscription status:", error);
    } else {
      console.log(`[Webhook] 🔄 User ${userId} premium status: ${isActive}`);
    }
  } catch (error: any) {
    console.error("[Webhook] Error in handleSubscriptionUpdated:", error.message);
  }
}
