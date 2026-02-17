// Send Premium Upgrade Email Campaign via Resend
// Usage: node send-premium-campaign.js

const fs = require('fs');
const path = require('path');

// You'll need to install: npm install resend
// Or use fetch API directly

const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY_HERE';
const FROM_EMAIL = 'StudyMaxx <onboarding@studymaxx.net>'; // Replace with your verified domain
const BATCH_SIZE = 100; // Resend recommends sending in batches

// Sample user list - Replace with your actual users from Supabase
// Query: SELECT email FROM users WHERE is_premium = false AND email IS NOT NULL LIMIT 1000;
const users = [
  // { email: 'user1@example.com' },
  // { email: 'user2@example.com' },
  // Add your users here
];

async function sendEmailBatch(batch) {
  const htmlContent = fs.readFileSync(
    path.join(__dirname, 'email-templates', 'premium-upgrade-campaign.html'), 
    'utf-8'
  );

  const promises = batch.map(async (user) => {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: user.email,
          subject: '🎓 Unlock StudyMaxx Premium - 50% OFF for You!',
          html: htmlContent,
          // Optional: Add tags for tracking
          tags: [
            { name: 'campaign', value: 'premium-upgrade' },
            { name: 'version', value: 'v1' }
          ]
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✓ Sent to ${user.email} - ID: ${data.id}`);
        return { success: true, email: user.email, id: data.id };
      } else {
        console.error(`✗ Failed to send to ${user.email}: ${data.message}`);
        return { success: false, email: user.email, error: data.message };
      }
    } catch (error) {
      console.error(`✗ Error sending to ${user.email}:`, error.message);
      return { success: false, email: user.email, error: error.message };
    }
  });

  return Promise.all(promises);
}

async function sendCampaign() {
  console.log('🚀 Starting Premium Upgrade Email Campaign\n');
  
  if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
    console.error('❌ Error: RESEND_API_KEY not set!');
    console.log('Set it as environment variable or update the script.');
    process.exit(1);
  }

  if (users.length === 0) {
    console.error('❌ Error: No users to send to!');
    console.log('Update the users array with your free-tier users.');
    process.exit(1);
  }

  console.log(`📧 Preparing to send to ${users.length} users in batches of ${BATCH_SIZE}\n`);

  let totalSent = 0;
  let totalFailed = 0;

  // Send in batches to avoid rate limits
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} emails):\n`);
    
    const results = await sendEmailBatch(batch);
    
    const batchSuccess = results.filter(r => r.success).length;
    const batchFailed = results.filter(r => !r.success).length;
    
    totalSent += batchSuccess;
    totalFailed += batchFailed;

    console.log(`\n   ✓ Sent: ${batchSuccess}`);
    console.log(`   ✗ Failed: ${batchFailed}`);

    // Wait 1 second between batches to respect rate limits
    if (i + BATCH_SIZE < users.length) {
      console.log('\n⏳ Waiting 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Campaign Summary:');
  console.log('='.repeat(50));
  console.log(`Total Sent: ${totalSent}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalSent / users.length) * 100).toFixed(1)}%`);
  console.log('\n✅ Campaign complete!');
}

// Run the campaign
sendCampaign().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
