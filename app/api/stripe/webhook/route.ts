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
  apiVersion: "2026-01-28.clover",
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

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[Webhook] Invoice payment succeeded");
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        // Log only — don't remove premium on first failure; Stripe will retry
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[Webhook] Invoice payment failed for customer:", invoice.customer);
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
  console.log('[Webhook] ========================================');
  console.log('[Webhook] CHECKOUT SESSION COMPLETED');
  console.log('[Webhook] ========================================');
  
  // Get userId from metadata OR client_reference_id (fallback)
  const userId = session.metadata?.userId || session.client_reference_id;

  // ENHANCED LOGGING
  console.log('[Webhook] Session Details:');
  console.log('[Webhook] - ID:', session.id);
  console.log('[Webhook] - Customer Email:', session.customer_email);
  console.log('[Webhook] - Customer ID:', session.customer);
  console.log('[Webhook] - Subscription ID:', session.subscription);
  console.log('[Webhook] - Metadata userId:', session.metadata?.userId);
  console.log('[Webhook] - client_reference_id:', session.client_reference_id);
  console.log('[Webhook] - RESOLVED_USER_ID:', userId);
  console.log('[Webhook] ========================================');

  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.error("[Webhook] ❌❌❌ CRITICAL: Cannot identify user - no userId in metadata or client_reference_id");
    console.error("[Webhook] Session data:", {
      customer_email: session.customer_email,
      id: session.id,
      metadata: JSON.stringify(session.metadata),
      client_reference_id: session.client_reference_id,
    });
    console.error('[Webhook] ❌ ABORTING - No user will be upgraded to premium');
    return;
  }

  console.log(`[Webhook] ✅ User identified: ${userId}`);
  console.log(`[Webhook] Processing checkout for user: ${userId}`);

  try {
    // Get the subscription to find the period end date
    let premiumExpiresAt = null;
    let subscriptionId = null;
    
    if (session.subscription) {
      try {
        subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subData = subscription as any;
        
        // Get period end from items first (most reliable), fallback to subscription level
        let periodEnd = null;
        if (subData.items?.data?.[0]?.current_period_end) {
          periodEnd = subData.items.data[0].current_period_end;
        } else if (subData.current_period_end) {
          periodEnd = subData.current_period_end;
        }
        
        premiumExpiresAt = periodEnd 
          ? new Date(periodEnd * 1000).toISOString()
          : null;
          
        console.log(`[Webhook] ✅ Subscription retrieved: ${subscriptionId}`);
        console.log(`[Webhook] Period end timestamp: ${periodEnd}`);
        console.log(`[Webhook] Premium expires at: ${premiumExpiresAt}`);
      } catch (subError: any) {
        console.warn(`[Webhook] ⚠️  Could not retrieve subscription: ${subError.message}`);
      }
    } else {
      console.warn('[Webhook] ⚠️  No subscription ID in session');
    }

    const customerId = session.customer as string;
    console.log(`[Webhook] Customer ID: ${customerId}`);
    console.log(`[Webhook] Subscription ID: ${subscriptionId}`);

    // Check if user exists
    console.log(`[Webhook] Checking if user ${userId} exists in Supabase...`);
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id, is_grandfathered, email")
      .eq("id", userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means no rows found (which is expected for new users)
      console.error("[Webhook] ❌ Error checking existing user:", selectError);
    }

    if (existingUser) {
      console.log(`[Webhook] ✅ User exists in Supabase: ${existingUser.email}`);
      
      // Update existing user to Premium
      const updateData: any = {
        is_premium: true,
        premium_expires_at: premiumExpiresAt,
        email: session.customer_email,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_tier: 'premium',
      };

      console.log('[Webhook] 📝 Updating user with data:', JSON.stringify(updateData, null, 2));

      const { error: updateError, data: updateResult } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select();

      if (updateError) {
        console.error("[Webhook] ❌❌❌ FAILED to update user to premium:", updateError);
        console.error("[Webhook] Error details:", JSON.stringify(updateError, null, 2));
        throw updateError;
      } else {
        console.log(`[Webhook] ✅✅✅ SUCCESS! User ${userId} upgraded to Premium`);
        console.log(`[Webhook] Premium expires: ${premiumExpiresAt}`);
        console.log(`[Webhook] Stripe Customer ID: ${customerId}`);
        console.log(`[Webhook] Stripe Subscription ID: ${subscriptionId}`);
        console.log('[Webhook] Updated data:', JSON.stringify(updateResult, null, 2));
      }
    } else {
      console.log(`[Webhook] ℹ️  User does not exist - creating new premium user`);
      
      // Create new user as Premium
      const insertData = {
        id: userId,
        email: session.customer_email,
        is_premium: true,
        premium_expires_at: premiumExpiresAt,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_tier: 'premium',
        is_grandfathered: false,
      };

      console.log('[Webhook] 📝 Inserting new user:', JSON.stringify(insertData, null, 2));

      const { error: insertError, data: insertResult } = await supabase
        .from("users")
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("[Webhook] ❌❌❌ FAILED to create premium user:", insertError);
        console.error("[Webhook] Error details:", JSON.stringify(insertError, null, 2));
        throw insertError;
      } else {
        console.log(`[Webhook] ✅✅✅ SUCCESS! New user ${userId} created as Premium`);
        console.log('[Webhook] Inserted data:', JSON.stringify(insertResult, null, 2));
      }
    }
    
    console.log('[Webhook] ========================================');
    console.log('[Webhook] CHECKOUT COMPLETED SUCCESSFULLY');
    console.log('[Webhook] ========================================');
    
  } catch (error: any) {
    console.error("[Webhook] ❌❌❌ FATAL ERROR in handleCheckoutCompleted:", error.message);
    console.error("[Webhook] Stack trace:", error.stack);
    // Still return success to Stripe - retries could cause double-charging
  }
}

/**
 * Handle subscription cancellation
 * Set expiration date to end of billing period (don't immediately remove premium)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.userId;
  const subData = subscription as any;
  const customerId = subscription.customer as string;

  console.log("[Webhook] subscription.deleted event received");
  console.log("[Webhook] - Subscription ID:", subscription.id);
  console.log("[Webhook] - Customer ID:", customerId);

  // If no userId in metadata, look it up using customer_id
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.log("[Webhook] No userId in metadata, looking up by customer_id...");
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (error) {
        console.error("[Webhook] ❌ Cannot find user by customer_id:", customerId, error);
        return;
      }

      if (user) {
        userId = user.id;
        console.log("[Webhook] ✅ Found userId by customer_id:", userId);
      } else {
        console.error("[Webhook] ❌ No user found with customer_id:", customerId);
        return;
      }
    } catch (lookupError: any) {
      console.error("[Webhook] ❌ Error looking up user by customer_id:", lookupError.message);
      return;
    }
  }

  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.error("[Webhook] ❌ Cannot process subscription.deleted - no userId found");
    console.error("[Webhook] Subscription ID:", subscription.id);
    return;
  }

  // Skip grandfathered users — they keep premium regardless of Stripe status
  const { data: gfUser } = await supabase.from('users').select('is_grandfathered').eq('id', userId).single();
  if (gfUser?.is_grandfathered) {
    console.log(`[Webhook] ⭐ Grandfathered user ${userId} — skipping subscription.deleted downgrade`);
    return;
  }
  let periodEnd = null;
  
  // Try to get current_period_end from subscription items
  if (subData.items?.data?.[0]?.current_period_end) {
    periodEnd = subData.items.data[0].current_period_end;
  }
  // Fallback to subscription level
  else if (subData.current_period_end) {
    periodEnd = subData.current_period_end;
  }
  
  const periodEndDate = periodEnd 
    ? new Date(periodEnd * 1000)
    : new Date();

  console.log(`[Webhook] Processing subscription cancellation for user: ${userId}`);
  console.log(`[Webhook] User will lose Premium on: ${periodEndDate.toISOString()}`);

  try {
    const { error } = await supabase
      .from("users")
      .update({ 
        premium_expires_at: periodEndDate.toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[Webhook] ❌ Failed to set premium expiration:", error);
    } else {
      console.log(`[Webhook] ✅ Subscription cancelled - user ${userId} expires on ${periodEndDate.toISOString()}`);
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
  let userId = subscription.metadata?.userId;
  const subData = subscription as any;
  const customerId = subscription.customer as string;

  console.log("[Webhook] subscription.updated event received");
  console.log("[Webhook] - Subscription ID:", subscription.id);
  console.log("[Webhook] - Customer ID:", customerId);
  console.log("[Webhook] - Metadata userId:", userId);

  // If no userId in metadata, look it up using customer_id
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.log("[Webhook] No userId in metadata, looking up by customer_id...");
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (error) {
        console.error("[Webhook] ❌ Cannot find user by customer_id:", customerId, error);
        return;
      }

      if (user) {
        userId = user.id;
        console.log("[Webhook] ✅ Found userId by customer_id:", userId);
      } else {
        console.error("[Webhook] ❌ No user found with customer_id:", customerId);
        return;
      }
    } catch (lookupError: any) {
      console.error("[Webhook] ❌ Error looking up user by customer_id:", lookupError.message);
      return;
    }
  }

  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    console.error("[Webhook] ❌ Cannot process subscription.updated - no userId found");
    console.error("[Webhook] Subscription ID:", subscription.id);
    return;
  }

  // For grandfathered users: only allow premium renewals (isActive=true), never downgrades
  const { data: gfUserUpd } = await supabase.from('users').select('is_grandfathered').eq('id', userId).single();
  if (gfUserUpd?.is_grandfathered && !isActive) {
    console.log(`[Webhook] ⭐ Grandfathered user ${userId} — skipping subscription.updated downgrade (status: ${subscription.status})`);
    return;
  }
  const isActive = subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due";
  const isCanceled = subscription.cancel_at_period_end;
  
  // Calculate expiration date - check multiple sources
  let premiumExpiresAt = null;
  let periodEnd = null;
  
  // Try to get current_period_end from subscription items (most reliable)
  if (subData.items?.data?.[0]?.current_period_end) {
    periodEnd = subData.items.data[0].current_period_end;
  }
  // Fallback to subscription level
  else if (subData.current_period_end) {
    periodEnd = subData.current_period_end;
  }
  
  if (periodEnd) {
    premiumExpiresAt = new Date(periodEnd * 1000).toISOString();
  }
  
  console.log(`[Webhook] Period end timestamp: ${periodEnd}, expires at: ${premiumExpiresAt}`);

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

/**
 * Handle successful invoice payment (fires on every renewal)
 * This is the most reliable signal that a user has paid and should have premium access.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string | null;

  console.log("[Webhook] ========================================");
  console.log("[Webhook] INVOICE PAYMENT SUCCEEDED");
  console.log("[Webhook] - Customer ID:", customerId);
  console.log("[Webhook] - Subscription ID:", subscriptionId);
  console.log("[Webhook] ========================================");

  if (!subscriptionId) {
    console.log("[Webhook] No subscription on this invoice (one-time charge?), skipping.");
    return;
  }

  // Look up the user by stripe_customer_id
  const { data: user, error: lookupError } = await supabase
    .from("users")
    .select("id, email")
    .eq("stripe_customer_id", customerId)
    .single();

  if (lookupError || !user) {
    // Try by subscription id as fallback
    const { data: userBySub, error: subLookupError } = await supabase
      .from("users")
      .select("id, email")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (subLookupError || !userBySub) {
      console.error("[Webhook] ❌ Cannot find user for customer:", customerId, "sub:", subscriptionId);
      return;
    }

    // Use the user found by subscription id and fall through
    const userId = userBySub.id;
    await applyPremiumFromSubscription(userId, subscriptionId);
    return;
  }

  await applyPremiumFromSubscription(user.id, subscriptionId);
}

/**
 * Fetch the subscription from Stripe and set is_premium=true with correct expiry.
 */
async function applyPremiumFromSubscription(userId: string, subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subData = subscription as any;

    let periodEnd: number | null = null;
    if (subData.items?.data?.[0]?.current_period_end) {
      periodEnd = subData.items.data[0].current_period_end;
    } else if (subData.current_period_end) {
      periodEnd = subData.current_period_end;
    }

    const premiumExpiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

    const { error } = await supabase
      .from("users")
      .update({
        is_premium: true,
        premium_expires_at: premiumExpiresAt,
        stripe_subscription_id: subscriptionId,
        subscription_tier: "premium",
      })
      .eq("id", userId);

    if (error) {
      console.error("[Webhook] ❌ applyPremiumFromSubscription failed:", error);
    } else {
      console.log(`[Webhook] ✅ User ${userId} confirmed premium via invoice — expires ${premiumExpiresAt}`);
    }
  } catch (err: any) {
    console.error("[Webhook] ❌ Error in applyPremiumFromSubscription:", err.message);
  }
}
