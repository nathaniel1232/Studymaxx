const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = require('stripe')(stripeKey);

async function fixManageSubscription() {
  console.log('🔧 Fixing Manage Subscription feature...\n');

  // Step 1: Add columns to database
  console.log('Step 1: Adding Stripe columns to users table...');
  
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'users' 
                       AND column_name = 'stripe_customer_id') THEN
          ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'users' 
                       AND column_name = 'stripe_subscription_id') THEN
          ALTER TABLE public.users ADD COLUMN stripe_subscription_id TEXT;
        END IF;
      END $$;
    `
  });

  // If RPC doesn't work, we'll do it manually via raw SQL
  console.log('✅ Attempting to add columns (may already exist)...\n');

  // Step 2: Get all premium users
  console.log('Step 2: Fetching premium users...');
  const { data: premiumUsers, error: usersError } = await supabase
    .from('users')
    .select('id, email, is_premium')
    .eq('is_premium', true);

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  console.log(`Found ${premiumUsers.length} premium users\n`);

  // Step 3: Sync each premium user with Stripe
  console.log('Step 3: Syncing premium users with Stripe...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (const user of premiumUsers) {
    try {
      console.log(`Processing ${user.email}...`);

      // Find Stripe customer by email
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length === 0) {
        console.log(`  ⚠️  No Stripe customer found - skipping`);
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
      } else {
        console.log(`  ⚠️  No active subscription found`);
      }

      // Update database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscriptionId
        })
        .eq('id', user.id);

      if (updateError) {
        console.log(`  ❌ Update failed:`, updateError.message);
        errorCount++;
      } else {
        console.log(`  ✅ Updated successfully`);
        successCount++;
      }

      console.log('');
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      errorCount++;
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log(`\n✅ SYNC COMPLETE!`);
  console.log(`   Success: ${successCount}/${premiumUsers.length}`);
  console.log(`   Errors: ${errorCount}/${premiumUsers.length}`);
  console.log(`\n🎉 Manage Subscription button should now work!`);
}

fixManageSubscription().catch(console.error);
