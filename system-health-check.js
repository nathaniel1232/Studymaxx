require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function comprehensiveCheck() {
  console.log('\n🔍 COMPREHENSIVE SYSTEM CHECK\n');
  console.log('═'.repeat(60));
  
  const checks = [];
  
  // 1. Check environment variables
  console.log('\n1️⃣  ENVIRONMENT VARIABLES');
  const envVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const varName of envVars) {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName}: Set (${process.env[varName].substring(0, 10)}...)`);
      checks.push({ name: varName, status: 'ok' });
    } else {
      console.log(`  ❌ ${varName}: NOT SET`);
      checks.push({ name: varName, status: 'missing' });
    }
  }
  
  // 2. Check database schema
  console.log('\n2️⃣  DATABASE SCHEMA');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.log('  ❌ Cannot query users table:', error.message);
      checks.push({ name: 'Database Query', status: 'fail' });
    } else if (data) {
      console.log('  ✅ Users table accessible');
      console.log('  ✅ Column count:', Object.keys(data).length);
      
      const requiredColumns = [
        'id', 'email', 'is_premium', 'stripe_customer_id',
        'stripe_subscription_id', 'premium_expires_at', 'is_grandfathered'
      ];
      
      for (const col of requiredColumns) {
        if (data.hasOwnProperty(col)) {
          console.log(`    ✅ ${col}`);
        } else {
          console.log(`    ❌ ${col} MISSING`);
          checks.push({ name: col, status: 'missing column' });
        }
      }
      
      // Check for problematic columns
      if (data.hasOwnProperty('grandfathered_price_cents')) {
        console.log('    ⚠️  grandfathered_price_cents exists (webhook will fail!)');
        checks.push({ name: 'grandfathered_price_cents', status: 'should not exist' });
      }
      
      checks.push({ name: 'Database Schema', status: 'ok' });
    }
  } catch (err) {
    console.log('  ❌ Database error:', err.message);
    checks.push({ name: 'Database Connection', status: 'fail' });
  }
  
  // 3. Check webhook configuration
  console.log('\n3️⃣  WEBHOOK CONFIGURATION');
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 5 });
    console.log(`  ✅ Found ${endpoints.data.length} webhook endpoint(s)`);
    
    for (const endpoint of endpoints.data) {
      console.log(`\n    URL: ${endpoint.url}`);
      console.log(`    Status: ${endpoint.status}`);
      console.log(`    Events: ${endpoint.enabled_events.join(', ')}`);
      
      const requiredEvents = [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ];
      
      const hasAllEvents = requiredEvents.every(e => endpoint.enabled_events.includes(e));
      if (hasAllEvents) {
        console.log('    ✅ All required events configured');
        checks.push({ name: 'Webhook Events', status: 'ok' });
      } else {
        console.log('    ⚠️  Missing some required events');
        checks.push({ name: 'Webhook Events', status: 'incomplete' });
      }
    }
  } catch (err) {
    console.log('  ❌ Cannot check webhooks:', err.message);
  }
  
  // 4. Test recent premium activations
  console.log('\n4️⃣  RECENT PREMIUM ACTIVATIONS');
  try {
    const { data: recentPremium } = await supabase
      .from('users')
      .select('email, is_premium, stripe_subscription_id, created_at')
      .eq('is_premium', true)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recentPremium && recentPremium.length > 0) {
      console.log(`  ✅ Found ${recentPremium.length} recent premium users:`);
      for (const user of recentPremium) {
        console.log(`    - ${user.email} (${new Date(user.created_at).toLocaleString()})`);
      }
      checks.push({ name: 'Recent Activations', status: 'ok' });
    } else {
      console.log('  ℹ️  No premium users found yet');
    }
  } catch (err) {
    console.log('  ❌ Cannot check premium users:', err.message);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  
  const failures = checks.filter(c => c.status !== 'ok');
  
  if (failures.length === 0) {
    console.log('\n✅✅✅ ALL CHECKS PASSED!');
    console.log('\n🎉 Premium activation system is fully operational');
  } else {
    console.log(`\n⚠️  ${failures.length} issue(s) found:`);
    failures.forEach(f => {
      console.log(`  - ${f.name}: ${f.status}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
}

comprehensiveCheck().catch(console.error);
