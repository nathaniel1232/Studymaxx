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

const stripe = require('stripe')(stripeKey);
const { Pool } = require('pg');

// Parse Supabase URL to get Postgres connection string
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const connectionString = `postgresql://postgres.${projectRef}:${supabaseKey}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function syncStripeData() {
  console.log('🔧 Syncing Stripe data with database...\n');

  try {
    // First, add columns if they don't exist
    console.log('Step 1: Adding columns to database...');
    await pool.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
    `);
    console.log('✅ Columns added\n');

    // Get all premium users
    console.log('Step 2: Fetching premium users...');
    const result = await pool.query('SELECT id, email, is_premium FROM public.users WHERE is_premium = true');
    const premiumUsers = result.rows;
    console.log(`Found ${premiumUsers.length} premium users\n`);

    // Sync each user with Stripe
    console.log('Step 3: Syncing with Stripe...\n');
    
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

        // Update database with raw SQL
        await pool.query(
          'UPDATE public.users SET stripe_customer_id = $1, stripe_subscription_id = $2 WHERE id = $3',
          [customer.id, subscriptionId, user.id]
        );

        console.log(`  ✅ Updated successfully\n`);
        successCount++;
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
    console.log(`\n🎉 Manage Subscription button should now work for all synced users!`);

    await pool.end();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

syncStripeData().catch(console.error);
