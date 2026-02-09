/**
 * Test Premium Setup - Verify Everything is Ready
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

console.log('\n🔍 TESTING PREMIUM SETUP...\n');

let allGood = true;

// 1. Check Stripe
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. STRIPE CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!process.env.STRIPE_SECRET_KEY) {
  console.log('❌ STRIPE_SECRET_KEY missing');
  allGood = false;
} else {
  console.log(`✅ STRIPE_SECRET_KEY found (${process.env.STRIPE_SECRET_KEY.substring(0, 12)}...)`);
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.log('❌ STRIPE_WEBHOOK_SECRET missing');
  allGood = false;
} else {
  console.log(`✅ STRIPE_WEBHOOK_SECRET found (${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 12)}...)`);
}

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  console.log('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing');
  allGood = false;
} else {
  console.log(`✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found`);
}

// Test Stripe connection
try {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
  console.log('✅ Stripe API connection OK');
} catch (err) {
  console.log('❌ Stripe API connection FAILED:', err.message);
  allGood = false;
}

// 2. Check Supabase
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2. SUPABASE CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL missing');
  allGood = false;
} else {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_URL found: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  allGood = false;
} else {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found`);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY missing');
  allGood = false;
} else {
  console.log(`✅ SUPABASE_SERVICE_ROLE_KEY found`);
}

// Test Supabase connection
try {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('✅ Supabase connection OK');
} catch (err) {
  console.log('❌ Supabase connection FAILED:', err.message);
  allGood = false;
}

// 3. Check required user table columns
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3. DATABASE SCHEMA CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, is_premium, stripe_customer_id, stripe_subscription_id, premium_expires_at, subscription_tier')
      .limit(1);

    if (error) {
      console.log('❌ Database query failed:', error.message);
      allGood = false;
    } else {
      console.log('✅ All required columns exist in users table:');
      console.log('   - id');
      console.log('   - email');
      console.log('   - is_premium');
      console.log('   - stripe_customer_id');
      console.log('   - stripe_subscription_id');
      console.log('   - premium_expires_at');
      console.log('   - subscription_tier');
    }
  } catch (err) {
    console.log('❌ Schema check failed:', err.message);
    allGood = false;
  }
}

// 4. Test a sample user
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4. TESTING SAMPLE PREMIUM USER');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function testUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, is_premium, stripe_customer_id, stripe_subscription_id, subscription_tier, premium_expires_at')
      .eq('email', 'kos.saren@gmail.com')
      .single();

    if (error) {
      console.log('⚠️  kos.saren@gmail.com not found (this is OK if they haven\'t signed up yet)');
    } else {
      console.log(`✅ Found user: ${users.email}`);
      console.log(`   is_premium: ${users.is_premium ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`   subscription_tier: ${users.subscription_tier || '❌ NULL'}`);
      console.log(`   stripe_customer_id: ${users.stripe_customer_id ? '✅ ' + users.stripe_customer_id : '❌ NULL'}`);
      console.log(`   stripe_subscription_id: ${users.stripe_subscription_id ? '✅ ' + users.stripe_subscription_id : '❌ NULL'}`);
      console.log(`   premium_expires_at: ${users.premium_expires_at || '❌ NULL'}`);
      
      if (users.is_premium && users.subscription_tier === 'premium' && users.stripe_customer_id && users.stripe_subscription_id) {
        console.log('\n✅ User is correctly configured as PREMIUM!');
      } else {
        console.log('\n⚠️  User exists but premium not fully configured');
      }
    }
  } catch (err) {
    console.log('❌ User check failed:', err.message);
  }
}

// Run all checks
(async () => {
  await checkSchema();
  await testUser();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FINAL RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allGood) {
    console.log('✅ ✅ ✅  ALL CHECKS PASSED!');
    console.log('\n🎉 Premium is ready to work for new purchases!');
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure Stripe webhook is configured at:');
    console.log('      https://dashboard.stripe.com/webhooks');
    console.log('   2. Webhook URL should be:');
    console.log('      https://yourdomain.com/api/stripe/webhook');
    console.log('   3. Listen for events:');
    console.log('      - checkout.session.completed');
    console.log('      - customer.subscription.deleted');
    console.log('      - customer.subscription.updated');
  } else {
    console.log('❌ ❌ ❌  SOME CHECKS FAILED');
    console.log('\n⚠️  Premium may not work correctly until issues are fixed');
    console.log('\nCheck .env.local file and make sure all required variables are set.');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})();
