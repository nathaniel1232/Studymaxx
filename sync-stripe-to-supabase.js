/**
 * STRIPE → SUPABASE SYNC SCRIPT
 * 
 * This script fetches ALL active subscriptions from Stripe and updates Supabase
 * with the correct stripe_customer_id and stripe_subscription_id.
 * 
 * Run this to fix all users who paid but don't have Stripe IDs in database.
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize clients
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncStripeToSupabase() {
  console.log('🔄 Starting Stripe → Supabase sync...\n');

  try {
    // 1. Get ALL customers from Stripe
    console.log('📥 Fetching all Stripe customers...');
    const customers = await stripe.customers.list({ 
      limit: 100,
      expand: ['data.subscriptions']
    });
    
    console.log(`✅ Found ${customers.data.length} Stripe customers\n`);

    let synced = 0;
    let errors = 0;
    let alreadySet = 0;

    // 2. For each customer, check subscriptions
    for (const customer of customers.data) {
      const email = customer.email;
      if (!email) {
        console.log(`⚠️  Skipping customer ${customer.id} - no email`);
        continue;
      }

      console.log(`\n📧 Processing: ${email}`);
      console.log(`   Stripe Customer ID: ${customer.id}`);

      // Get active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10
      });

      if (subscriptions.data.length === 0) {
        console.log(`   ⚠️  No active subscriptions`);
        continue;
      }

      const subscription = subscriptions.data[0]; // Use first active subscription
      console.log(`   Stripe Subscription ID: ${subscription.id}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Period End: ${new Date(subscription.current_period_end * 1000).toISOString()}`);

      // 3. Find user in Supabase by email
      const { data: users, error: findError } = await supabase
        .from('users')
        .select('id, email, stripe_customer_id, stripe_subscription_id, is_premium')
        .eq('email', email);

      if (findError) {
        console.log(`   ❌ Error finding user: ${findError.message}`);
        errors++;
        continue;
      }

      if (!users || users.length === 0) {
        console.log(`   ⚠️  User not found in Supabase - creating new user`);
        
        // Create user if doesn't exist
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            email: email,
            is_premium: true,
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_tier: 'premium'
          });

        if (insertError) {
          console.log(`   ❌ Failed to create user: ${insertError.message}`);
          errors++;
        } else {
          console.log(`   ✅ Created new premium user`);
          synced++;
        }
        continue;
      }

      const user = users[0];
      console.log(`   Supabase User ID: ${user.id}`);
      console.log(`   Current is_premium: ${user.is_premium}`);
      console.log(`   Current stripe_customer_id: ${user.stripe_customer_id || 'NULL'}`);

      // Check if already has Stripe IDs
      if (user.stripe_customer_id && user.stripe_subscription_id) {
        console.log(`   ℹ️  Already has Stripe IDs - skipping`);
        alreadySet++;
        continue;
      }

      // 4. Update Supabase with Stripe IDs
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_premium: true,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          subscription_tier: 'premium'
        })
        .eq('id', user.id);

      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   ✅ SYNCED - Stripe IDs added to Supabase`);
        synced++;
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully synced: ${synced}`);
    console.log(`ℹ️  Already had Stripe IDs: ${alreadySet}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📧 Total customers processed: ${customers.data.length}`);
    console.log('='.repeat(60));

    console.log('\n🎉 Sync complete! Now all users should have Stripe IDs in Supabase.');
    console.log('\n📝 Next steps:');
    console.log('1. Tell affected users to logout/login');
    console.log('2. Premium status should now work correctly');
    console.log('3. "Manage Subscription" button should appear');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the sync
console.log('=' .repeat(60));
console.log('🚀 STRIPE → SUPABASE SYNC TOOL');
console.log('=' .repeat(60));
console.log('\nThis will sync all Stripe subscriptions to Supabase.');
console.log('It will add stripe_customer_id and stripe_subscription_id');
console.log('for users who are missing this data.\n');

syncStripeToSupabase();
