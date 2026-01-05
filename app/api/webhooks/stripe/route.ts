/**
 * Stripe Webhook Handler
 * Alternative endpoint path to bypass Vercel routing issues
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/app/utils/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  console.log("[Webhook] Received POST request");
  
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook] No signature found");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error("[Webhook] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("[Webhook] Event verified:", event.type);
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

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
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

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

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (existingUser) {
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

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (!supabase) return;

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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (!supabase) return;

  const userId = subscription.metadata?.userId;
  if (!userId) return;

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
