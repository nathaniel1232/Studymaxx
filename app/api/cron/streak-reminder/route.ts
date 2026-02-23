import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailTemplates } from "@/app/utils/emailTemplates";

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
    const err = await response.text();
    throw new Error(err);
  }
}

/**
 * Cron endpoint: Send streak-break reminder emails
 * 
 * This runs daily and checks for users who:
 * - Had a study streak going (studied yesterday)
 * - Haven't studied today yet
 * 
 * Integration: Call this via Vercel Cron at ~6pm user's timezone
 * or a daily schedule like 18:00 UTC
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if Brevo is configured
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Streak Reminder] BREVO_API_KEY not configured');
    return NextResponse.json({ 
      message: "Email service not configured. Add BREVO_API_KEY to environment variables.",
      sent: 0 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users who studied yesterday but not today
    // We track this via the last_studied field on flashcard_sets
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Find users who have sets studied yesterday
    const { data: yesterdayStudiers } = await supabase
      .from("flashcard_sets")
      .select("user_id")
      .gte("last_studied", `${yesterdayStr}T00:00:00`)
      .lt("last_studied", `${todayStr}T00:00:00`);

    if (!yesterdayStudiers || yesterdayStudiers.length === 0) {
      return NextResponse.json({ message: "No streak reminders needed", sent: 0 });
    }

    // Get unique user IDs
    const userIds = [...new Set(yesterdayStudiers.map(s => s.user_id))];

    // Check which of those users haven't studied today
    const { data: todayStudiers } = await supabase
      .from("flashcard_sets")
      .select("user_id")
      .gte("last_studied", `${todayStr}T00:00:00`)
      .in("user_id", userIds);

    const todayUserIds = new Set((todayStudiers || []).map(s => s.user_id));
    const needReminder = userIds.filter(id => !todayUserIds.has(id));

    if (needReminder.length === 0) {
      return NextResponse.json({ message: "All streakers studied today!", sent: 0 });
    }

    // Get emails for users who need reminders and send emails
    let emailsSent = 0;
    let emailsFailed = 0;
    
    for (const userId of needReminder) {
      try {
        const { data: user } = await supabase.auth.admin.getUserById(userId);
        if (user?.user?.email) {
          // Get user's name from profile if available
          const { data: profile } = await supabase
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();
          
          const template = emailTemplates.streakReminder(
            '', // We can add name field to users table later
            7,  // Default streak days - could be calculated from DB
            'your study set' // Could be fetched from database
          );
          
          await sendEmail(user.user.email, template.subject, template.html);
          
          console.log(`[Streak Reminder] ✅ Sent email to ${user.user.email}`);
          emailsSent++;
        }
      } catch (error: any) {
        console.error(`[Streak Reminder] Failed to send email:`, error.message);
        emailsFailed++;
      }
    }

    return NextResponse.json({ 
      message: `Streak reminders processed`, 
      needReminder: needReminder.length,
      emailsSent,
      emailsFailed
    });
  } catch (error: any) {
    console.error("[Streak Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
