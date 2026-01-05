/**
 * Cron job that runs daily to sync Stripe subscriptions with database
 * Vercel will automatically call this endpoint every day at 2 AM UTC
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request: NextRequest) {
  // Verify the request came from Vercel's cron service
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting Stripe sync...");

    // Get all Stripe customers with active subscriptions
    const customers = await stripe.customers.list({ limit: 100 });
    let activated = 0;
    let skipped = 0;

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
      });

      if (subscriptions.data.length > 0 && customer.email) {
        // Check if they're premium in database
        const { data: user } = await supabase
          .from("users")
          .select("email, is_premium")
          .eq("email", customer.email)
          .single();

        if (user && !user.is_premium) {
          // Activate them
          await supabase
            .from("users")
            .update({ is_premium: true })
            .eq("email", customer.email);

          console.log(`[Cron] ✅ ACTIVATED: ${customer.email}`);
          activated++;
        } else if (user && user.is_premium) {
          console.log(`[Cron] ✓ Already premium: ${customer.email}`);
          skipped++;
        }
      }
    }

    console.log(`[Cron] Sync complete. Activated: ${activated}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      activated,
      skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron] Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export const preferredRegion = "iad1";
