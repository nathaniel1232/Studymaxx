/**
 * Send promotional emails to non-premium users
 * Usage: node send-emails.js [welcome|feature-unlock|comeback] [limit]
 */

const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

async function sendEmails() {
  const templateType = process.argv[2] || "welcome";
  const limit = parseInt(process.argv[3] || "50");
  const baseUrl = "https://www.studymaxx.net"; // Change to localhost:3000 for testing

  console.log(`📧 Sending '${templateType}' emails (limit: ${limit})`);
  console.log(`URL: ${baseUrl}/api/email/send-promo`);

  try {
    const response = await fetch(`${baseUrl}/api/email/send-promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.EMAIL_ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        templateType,
        limit,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error:", data.error);
      process.exit(1);
    }

    console.log("\n✅ Success!");
    console.log(`📨 Sent: ${data.totalSent}/${data.totalSent + data.totalFailed}`);
    console.log(`❌ Failed: ${data.totalFailed}`);

    if (data.results && data.results.length > 0) {
      console.log("\nFirst 5 results:");
      data.results.slice(0, 5).forEach((result, i) => {
        const status = result.success ? "✅" : "❌";
        console.log(`  ${status} ${result.email}`);
      });
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    process.exit(1);
  }
}

sendEmails();
