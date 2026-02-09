/**
 * STRIPE → SUPABASE SYNC SCRIPT (Simple Version)
 * No external dependencies required
 */

const fs = require('fs');
const https = require('https');

// Read .env.local manually
function loadEnv() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    const env = {};
    
    lines.forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    console.error('❌ Failed to read .env.local:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();

console.log('🔧 STRIPE → SUPABASE SYNC');
console.log('========================\n');

// Validate env vars
if (!env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

if (!env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('✅ Environment variables loaded\n');

// Function to make HTTPS requests
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function syncStripeToSupabase() {
  try {
    console.log('📥 Fetching Stripe customers...\n');
    
    // Get customers from Stripe
    const customers = await httpsRequest('https://api.stripe.com/v1/customers?limit=100', {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    });

    if (!customers.data) {
      console.error('❌ Failed to fetch customers from Stripe');
      return;
    }

    console.log(`✅ Found ${customers.data.length} Stripe customers\n`);

    let synced = 0;
    let errors = 0;
    let alreadySet = 0;

    for (const customer of customers.data) {
      const email = customer.email;
      if (!email) continue;

      console.log(`\n📧 ${email}`);
      console.log(`   Customer ID: ${customer.id}`);

      // Get active subscriptions
      const subscriptions = await httpsRequest(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active`, 
        {
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
          }
        }
      );

      if (!subscriptions.data || subscriptions.data.length === 0) {
        console.log('   ⚠️  No active subscriptions');
        continue;
      }

      const subscription = subscriptions.data[0];
      console.log(`   Subscription ID: ${subscription.id}`);
      console.log(`   Status: ${subscription.status}`);

      // Find user in Supabase by email
      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
      const users = await httpsRequest(
        `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*`,
        {
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );

      if (!users || users.length === 0) {
        console.log('   ⚠️  User not found in Supabase');
        continue;
      }

      const user = users[0];
      console.log(`   User ID: ${user.id}`);

      // Check if already has Stripe IDs
      if (user.stripe_customer_id && user.stripe_subscription_id) {
        console.log('   ℹ️  Already has Stripe IDs');
        alreadySet++;
        continue;
      }

      // Update Supabase with Stripe IDs
      const updateResult = await httpsRequest(
        `${supabaseUrl}/rest/v1/users?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: {
            is_premium: true,
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_tier: 'premium'
          }
        }
      );

      console.log('   ✅ SYNCED!');
      synced++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully synced: ${synced}`);
    console.log(`ℹ️  Already had Stripe IDs: ${alreadySet}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📧 Total customers processed: ${customers.data.length}`);
    console.log('='.repeat(60));

    console.log('\n🎉 Sync complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Tell affected users to logout/login');
    console.log('2. Premium status should now work correctly');
    console.log('3. "Manage Subscription" button should appear\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncStripeToSupabase();
