/**
 * TEST ENDPOINT - Simulate Stripe Webhook for Development
 * 
 * Dette er for testing uten Stripe CLI.
 * For å sette en bruker til Premium manuelt:
 * 
 * POST http://localhost:3000/api/stripe/test-webhook
 * Body: { "userId": "din-user-id" }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabase";

export async function POST(req: NextRequest) {
  // Kun for development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const { userId, action = "activate" } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Activate or deactivate premium
    const isPremium = action === "activate";

    const { error } = await supabase
      .from("users")
      .update({ is_premium: isPremium })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update user:", error);
      return NextResponse.json(
        { error: "Failed to update user", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      isPremium,
      message: `User ${userId} is now ${isPremium ? "Premium" : "Free"}`,
    });
  } catch (error: any) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

// GET for testing
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const action = searchParams.get("action") || "activate";

  if (!userId) {
    return NextResponse.json({
      message: "Test webhook endpoint for development",
      usage: {
        POST: "POST /api/stripe/test-webhook with { userId, action?: 'activate'|'deactivate' }",
        GET: "GET /api/stripe/test-webhook?userId=XXX&action=activate",
      },
    });
  }

  // Same logic as POST
  return POST(req);
}
