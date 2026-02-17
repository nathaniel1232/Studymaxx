// Send Premium Upgrade Email Campaign via Resend
// SETUP:
// 1. Export free users from Supabase SQL (see EMAIL_STRIPE_SETUP.md)
// 2. Paste emails in the users array below
// 3. Set RESEND_API_KEY environment variable
// 4. Test with one email first (see line 25)
// 5. Run: node send-premium-campaign.js

const fs = require('fs');
const path = require('path');

// ⚙️ CONFIGURATION
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY_HERE';
const FROM_EMAIL = 'StudyMaxx <onboarding@studymaxx.net>'; // Update with your verified domain
const BATCH_SIZE = 100;

// 📧 PASTE YOUR EXPORTED USERS HERE
// Got from: Supabase > SQL Editor > SELECT email FROM users...
// Format: { email: 'user@example.com' }
const users = [
  // TEST: Uncomment one line to test with yourself
  // { email: 'your-email@gmail.com' },

  // PRODUCTION: Paste all exported emails below
  // { email: 'user1@example.com' },
  // { email: 'user2@example.com' },
  // { email: 'user3@example.com' },
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
    console.error('❌ FATAL: RESEND_API_KEY not set!');
    console.error('\nFix this:');
    console.error('  Windows PowerShell: $env:RESEND_API_KEY = "re_xxxxx"');
    console.error('  Mac/Linux bash:     export RESEND_API_KEY="re_xxxxx"');
    console.error('\nThen run: node send-premium-campaign.js');
    process.exit(1);
  }

  if (users.length === 0) {
    console.error('❌ FATAL: No users in the array!');
    console.error('\nFix this:');
    console.error('1. Export users from Supabase (see EMAIL_STRIPE_SETUP.md)');
    console.error('2. Paste emails in the users array at top of this file');
    console.error('3. Format: { email: "user@example.com" }');
    console.error('\nThen run: node send-premium-campaign.js');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   From: ${FROM_EMAIL}`);
  console.log(`   Total emails: ${users.length}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`\n ⚠️  THIS IS A REAL CAMPAIGN - emails will actually be sent!\n`);

  // Only warn on large campaigns
  if (users.length > 50) {
    console.log('⏸️  Large campaign detected. Proceed? (y/n):');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('> ', (answer) => {
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Campaign cancelled.');
        process.exit(0);
      }
      startSending();
    });
  } else {
    startSending();
  }

  async function startSending() {
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(users.length / BATCH_SIZE)} (${batch.length} emails):\n`);
      
      const results = await sendEmailBatch(batch);
      
      const batchSuccess = results.filter(r => r.success).length;
      const batchFailed = results.filter(r => !r.success).length;
      
      totalSent += batchSuccess;
      totalFailed += batchFailed;

      console.log(`   ✓ Sent: ${batchSuccess}`);
      console.log(`   ✗ Failed: ${batchFailed}`);

      if (i + BATCH_SIZE < users.length) {
        console.log('\n⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 CAMPAIGN COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✓ Total Sent: ${totalSent}`);
    console.log(`✗ Total Failed: ${totalFailed}`);
    console.log(`  Success Rate: ${((totalSent / users.length) * 100).toFixed(1)}%`);
    
    console.log('\n📈 Next Steps:');
    console.log('   1. Check Resend dashboard: https://resend.com/emails');
    console.log('   2. Monitor Stripe for new customers: https://dashboard.stripe.com/customers');
    console.log('   3. Expected: 5-10 new premium users from this campaign');
    console.log('\n✅ Good luck! 🚀\n');
  }
}

// Run the campaign
sendCampaign().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
