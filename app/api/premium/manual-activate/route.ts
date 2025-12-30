/**
 * TEMPORARY: Manual Premium Activation
 * Only for testing - REMOVE in production!
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials not configured");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Manually activate Premium
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to activate premium:", updateError);
      return NextResponse.json(
        { error: "Failed to activate premium" },
        { status: 500 }
      );
    }

    console.log(`✅ Manually activated Premium for user: ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Premium activated! Refresh the page.",
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Manual activation error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
