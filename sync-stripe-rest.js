const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split(/\r?\n/).forEach(line => {
  line = line.trim();
  if (line.startsWith('#') || !line) return;
  
  const equalIndex = line.indexOf('=');
  if (equalIndex > 0) {
    const key = line.substring(0, equalIndex).trim();
    const value = line.substring(equalIndex + 1).trim().replace(/\/$/, '');
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = envVars.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey || !stripeKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const stripe = require('stripe')(stripeKey);

async function syncStripeData() {
  console.log('🔧 Syncing Stripe data with database...\n');

  try {
    // Get all premium users via REST API
    console.log('Step 1: Fetching premium users...');
    const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?is_premium=eq.true&select=id,email`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const premiumUsers = await usersResponse.json();
    console.log(`Found ${premiumUsers.length} premium users\n`);

    // Sync each user with Stripe
    console.log('Step 2: Syncing with Stripe...\n');
    
    let successCount = 0;
    let errorCount = 0;

    for (const user of premiumUsers) {
      try {
        console.log(`Processing ${user.email}...`);

        // Find Stripe customer
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1
        });

        if (customers.data.length === 0) {
          console.log(`  ⚠️  No Stripe customer found - skipping\n`);
          errorCount++;
          continue;
        }

        const customer = customers.data[0];
        console.log(`  Found customer: ${customer.id}`);

        // Get active subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1
        });

        const subscriptionId = subscriptions.data.length > 0 ? subscriptions.data[0].id : null;
        
        if (subscriptionId) {
          console.log(`  Found subscription: ${subscriptionId}`);
        }

        // Update database via REST API
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscriptionId
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.log(`  ❌ Update failed: ${errorText}\n`);
          errorCount++;
        } else {
          console.log(`  ✅ Updated successfully\n`);
          successCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error:`, error.message, '\n');
        errorCount++;
      }
    }

    // Summary
    console.log('='.repeat(80));
    console.log(`\n✅ SYNC COMPLETE!`);
    console.log(`   Success: ${successCount}/${premiumUsers.length}`);
    console.log(`   Errors: ${errorCount}/${premiumUsers.length}`);
    
    if (errorCount > 0) {
      console.log(`\n⚠️  Some users couldn't be synced. This is normal for:`);
      console.log(`   - Users activated via manual script (not through Stripe)`);
      console.log(`   - Test accounts`);
    }
    
    console.log(`\n🎉 Manage Subscription button should now work for all Stripe customers!`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

syncStripeData().catch(console.error);
