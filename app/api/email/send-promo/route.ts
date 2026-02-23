import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getWelcomeTemplate,
  getPracticeReminderTemplate,
  getPremiumUpgradeTemplate,
} from "@/app/lib/email-templates";

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY || '',
    },
    body: JSON.stringify({
      sender: { name: 'StudyMaxx', email: 'noreply@studymaxx.net' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Send campaign emails to non-premium users
 * POST /api/email/send-promo
 * Campaigns: welcome | practice-reminder | premium-unlock
 */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.EMAIL_ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { limit = 50, campaignType = "welcome" } = await request.json();
    console.log(`[Email] Campaign: ${campaignType}, Sending to ${limit} users`);

    // Build query based on campaign type
    let query = supabase
      .from("users")
      .select("id, email, created_at, last_login")
      .eq("is_premium", false);

    switch (campaignType) {
      case "welcome":
        query = query
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .is("welcome_email_sent_at", null);
        break;
      case "practice-reminder":
        query = query
          .lte("last_login", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .is("practice_reminder_sent_at", null);
        break;
      case "premium-unlock":
        query = query.is("premium_unlock_email_sent_at", null);
        break;
    }

    const { data: users } = await query.limit(limit);
    if (!users || users.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "No eligible users" });
    }

    let sent = 0, failed = 0;

    for (const user of users) {
      try {
        let html = "", subject = "";

        switch (campaignType) {
          case "welcome":
            subject = "Welcome to StudyMaxx! 🎓";
            html = getWelcomeTemplate(user.email.split("@")[0]);
            break;
          case "practice-reminder":
            subject = "Time to Level Up! 🎯";
            html = getPracticeReminderTemplate(user.email.split("@")[0]);
            break;
          case "premium-unlock":
            subject = "Unlock Premium Features ⚡";
            html = getPremiumUpgradeTemplate(user.email.split("@")[0]);
            break;
        }

        const { error: sendError } = await (async () => {
          try { await sendEmail(user.email, subject, html); return { error: null }; }
          catch (e: any) { return { error: e }; }
        })();

        if (sendError) {
          console.error(`[Email] Failed ${user.email}:`, sendError.message);
          failed++;
        } else {
          console.log(`[Email] ✅ Sent to ${user.email}`);
          sent++;

          // Mark as sent
          const field = `${campaignType.replace(/-/g, "_")}_sent_at`;
          const update: any = { [field]: new Date().toISOString() };
          try {
            await supabase.from("users").update(update).eq("id", user.id);
          } catch (err) {
            // Silently fail if update doesn't work
          }
        }
      } catch (err: any) {
        console.error("[Email] Send error:", err.message);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      campaign: campaignType,
      sent,
      failed,
      total: sent + failed,
    });
  } catch (error: any) {
    console.error("[Email] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
