import { NextRequest, NextResponse } from "next/server";

/**
 * Automated email campaign
 * Call this from Vercel Cron (Deployments → Crons)
 * 
 * Schedule: 0 9 * * 1 (Every Monday at 9 AM)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Cron secret
    if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call email endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/email/send-promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.EMAIL_ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        templateType: "comeback",
        limit: 100, // Send to max 100 users per run
      }),
    });

    const data = await response.json();

    console.log("[Cron] Email campaign completed:", {
      sent: data.totalSent,
      failed: data.totalFailed,
    });

    return NextResponse.json({
      success: true,
      sentCount: data.totalSent,
      failedCount: data.totalFailed,
    });
  } catch (error: any) {
    console.error("[Cron] Email campaign failed:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
