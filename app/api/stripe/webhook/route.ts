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
export const maxDuration = 60; // Increased to 60 seconds for database operations

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Main webhook handler - MUST be named POST
 */
export async function POST(request: NextRequest) {
  console.log("[Webhook] Received POST request");
  
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook] No signature header found");
      return NextResponse.json(
        { error: "No stripe-signature header" },
        { status: 400 }
      );
    }

    if (!webhookSecret || webhookSecret.length === 0) {
      console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured in environment");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("[Webhook] ✅ Event signature verified:", event.type, "ID:", event.id);
    } catch (err: any) {
      console.error("[Webhook] ❌ Signature verification failed:", err.message);
      console.error("[Webhook] Expected secret starts with:", webhookSecret.substring(0, 10));
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
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
 * Set user to Premium with expiration tracking
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Get userId from metadata OR client_reference_id (fallback)
  const userId = session.metadata?.userId || session.client_reference_id;

  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.error("[Webhook] ❌ Cannot identify user - no userId in metadata or client_reference_id");
    console.error("[Webhook] Session data:", {
      customer_email: session.customer_email,
      id: session.id,
      metadata: session.metadata,
      client_reference_id: session.client_reference_id,
    });
    return;
  }

  console.log(`[Webhook] Processing checkout for user: ${userId}`);

  try {
    // Get the subscription to find the period end date
    let premiumExpiresAt = null;
    
    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const subData = subscription as any;
        premiumExpiresAt = subData.current_period_end 
          ? new Date(subData.current_period_end * 1000).toISOString()
          : null;
        console.log(`[Webhook] Premium expires at: ${premiumExpiresAt}`);
      } catch (subError: any) {
        console.warn(`[Webhook] Could not retrieve subscription: ${subError.message}`);
      }
    }

    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id, is_grandfathered, grandfathered_price_cents")
      .eq("id", userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means no rows found (which is expected for new users)
      console.error("[Webhook] Error checking existing user:", selectError);
    }

    if (existingUser) {
      // Update existing user to Premium
      const updateData: any = {
        is_premium: true,
        premium_expires_at: premiumExpiresAt,
        email: session.customer_email,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_tier: 'premium',
      };

      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

      if (updateError) {
        console.error("[Webhook] ❌ Failed to update user to premium:", updateError);
        throw updateError;
      } else {
        console.log(`[Webhook] ✅ User ${userId} upgraded to Premium until ${premiumExpiresAt}`);
      }
    } else {
      // Create new user as Premium
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: session.customer_email,
          is_premium: true,
          premium_expires_at: premiumExpiresAt,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_tier: 'premium',
          is_grandfathered: false,
        });

      if (insertError) {
        console.error("[Webhook] ❌ Failed to create premium user:", insertError);
        throw insertError;
      } else {
        console.log(`[Webhook] ✅ New user ${userId} created as Premium until ${premiumExpiresAt}`);
      }
    }
  } catch (error: any) {
    console.error("[Webhook] ❌ Error in handleCheckoutCompleted:", error.message);
    // Still return success to Stripe - retries could cause double-charging
  }
}

/**
 * Handle subscription cancellation
 * Set expiration date to end of billing period (don't immediately remove premium)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const subData = subscription as any;

  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.error("[Webhook] ❌ Cannot process subscription.deleted - no userId in metadata");
    console.error("[Webhook] Subscription ID:", subscription.id);
    return;
  }

  // Get the period end date - user keeps premium until then
  const periodEnd = subData.current_period_end 
    ? new Date(subData.current_period_end * 1000)
    : new Date();

  console.log(`[Webhook] Processing subscription cancellation for user: ${userId}`);
  console.log(`[Webhook] User will lose Premium on: ${periodEnd.toISOString()}`);

  try {
    const { error } = await supabase
      .from("users")
      .update({ 
        premium_expires_at: periodEnd.toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[Webhook] ❌ Failed to set premium expiration:", error);
    } else {
      console.log(`[Webhook] ✅ Subscription cancelled - user ${userId} expires on ${periodEnd.toISOString()}`);
    }
  } catch (error: any) {
    console.error("[Webhook] ❌ Error in handleSubscriptionDeleted:", error.message);
  }
}

/**
 * Handle subscription updates (e.g., plan changes, renewals, cancellations)
 * This handles both renewal (extends expiration) and cancellation (sets expiration)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const subData = subscription as any;
  
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.error("[Webhook] ❌ Cannot process subscription.updated - no userId in metadata");
    console.error("[Webhook] Subscription ID:", subscription.id);
    return;
  }

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const isCanceled = subscription.cancel_at_period_end;
  
  // Calculate expiration date
  let premiumExpiresAt = null;
  if (subData.current_period_end) {
    premiumExpiresAt = new Date(subData.current_period_end * 1000).toISOString();
  }

  console.log(`[Webhook] Processing subscription update for user: ${userId}`, {
    subscriptionStatus: subscription.status,
    isActive,
    isCanceled,
    expiresAt: premiumExpiresAt
  });

  try {
    const updateData: any = {
      is_premium: isActive,
      premium_expires_at: premiumExpiresAt,
      stripe_subscription_id: subscription.id,
    };

    // If subscription is canceled but still active, keep premium until period end
    if (isCanceled && isActive) {
      console.log(`[Webhook] Subscription marked for cancellation but active until ${premiumExpiresAt}`);
      updateData.is_premium = true; // Keep premium until period end
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("[Webhook] ❌ Failed to update subscription status:", error);
    } else {
      console.log(`[Webhook] ✅ User ${userId} updated - premium: ${updateData.is_premium}, expires: ${premiumExpiresAt}`);
    }
  } catch (error: any) {
    console.error("[Webhook] ❌ Error in handleSubscriptionUpdated:", error.message);
  }
}
