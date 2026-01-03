/**
 * Stripe Webhook Handler
 * 
 * Listens to Stripe events and updates user premium status.
 * 
 * CRITICAL EVENTS:
 * - checkout.session.completed: User completed payment → set isPremium = true
 * - customer.subscription.deleted: Subscription cancelled → set isPremium = false
 * - customer.subscription.updated: Handle status changes
 * 
 * SECURITY: Verify webhook signature to prevent fake requests.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/app/utils/supabase";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      if (!webhookSecret) {
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 }
        );
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
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
    console.error("No userId in checkout session metadata");
    return;
  }

  if (!supabase) {
    console.error("Supabase not configured");
    return;
  }

  console.log(`✅ Checkout completed for user: ${userId}`);

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
      console.error("Failed to update user to premium:", error);
    } else {
      console.log(`✅ User ${userId} upgraded to Premium`);
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
      console.error("Failed to create premium user:", error);
    } else {
      console.log(`✅ User ${userId} created as Premium`);
    }
  }
}

/**
 * Handle subscription cancellation
 * Remove Premium status
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (!supabase) return;

  // Get userId from subscription metadata
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  console.log(`❌ Subscription cancelled for user: ${userId}`);

  const { error } = await supabase
    .from("users")
    .update({ is_premium: false })
    .eq("id", userId);

  if (error) {
    console.error("Failed to remove premium:", error);
  } else {
    console.log(`❌ User ${userId} is no longer Premium`);
  }
}

/**
 * Handle subscription updates (e.g., plan changes)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (!supabase) return;

  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Check if subscription is still active
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  const { error } = await supabase
    .from("users")
    .update({ is_premium: isActive })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update subscription status:", error);
  } else {
    console.log(`🔄 User ${userId} premium status: ${isActive}`);
  }
}

/**
 * Handle payment failures
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.warn(`⚠️ Payment failed for customer: ${invoice.customer}`);
  // TODO: Send email notification to user
  // For now, Stripe will retry automatically
}
