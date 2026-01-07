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

async function checkAdamTimeline() {
  const email = 'adamo.kozik@gmail.com';
  console.log(`🔍 Checking timeline for ${email}\n`);
  console.log('='.repeat(80));

  // 1. Check database
  console.log('\n📊 DATABASE STATUS:');
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`  Account Created: ${user.created_at}`);
  console.log(`  Last Updated: ${user.updated_at}`);
  console.log(`  Premium Status: ${user.is_premium ? '✅ YES' : '❌ NO'}`);
  
  const createdDate = new Date(user.created_at);
  const updatedDate = new Date(user.updated_at);
  const timeDiff = updatedDate - createdDate;
  const secondsDiff = Math.floor(timeDiff / 1000);
  
  console.log(`  Time between account creation and premium activation: ${secondsDiff} seconds`);

  // 2. Check Stripe
  console.log('\n💳 STRIPE PURCHASES:');
  try {
    // Search for customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10
    });

    if (customers.data.length === 0) {
      console.log('  ⚠️  No Stripe customer found with this email');
      console.log('  ❌ This means Adam has NOT purchased premium through Stripe!');
      return;
    }

    console.log(`  Found ${customers.data.length} Stripe customer(s)`);

    for (const customer of customers.data) {
      console.log(`\n  Customer ID: ${customer.id}`);
      console.log(`  Customer Created: ${new Date(customer.created * 1000).toISOString()}`);

      // Get subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });

      if (subscriptions.data.length === 0) {
        console.log('  ⚠️  No subscriptions found for this customer');
        continue;
      }

      console.log(`  Subscriptions: ${subscriptions.data.length}`);

      subscriptions.data.forEach((sub, i) => {
        console.log(`\n  Subscription ${i + 1}:`);
        console.log(`    ID: ${sub.id}`);
        console.log(`    Status: ${sub.status}`);
        console.log(`    Created: ${new Date(sub.created * 1000).toISOString()}`);
        if (sub.current_period_start) {
          console.log(`    Current Period Start: ${new Date(sub.current_period_start * 1000).toISOString()}`);
        }
        if (sub.current_period_end) {
          console.log(`    Current Period End: ${new Date(sub.current_period_end * 1000).toISOString()}`);
        }
        
        const subDate = new Date(sub.created * 1000);
        const dbCreatedDate = new Date(user.created_at);
        const dbUpdateDate = new Date(user.updated_at);
        
        console.log(`\n    📅 TIMELINE:`);
        console.log(`      1. User account created: ${dbCreatedDate.toISOString()}`);
        console.log(`      2. Stripe subscription created: ${subDate.toISOString()}`);
        console.log(`      3. Database premium activated: ${dbUpdateDate.toISOString()}`);
        
        const accountToStripe = Math.floor((subDate - dbCreatedDate) / 1000);
        const stripeToActivation = Math.floor((dbUpdateDate - subDate) / 1000);
        
        console.log(`\n    ⏱️  TIMING:`);
        console.log(`      Account → Stripe payment: ${accountToStripe} seconds`);
        console.log(`      Stripe payment → Premium activated: ${stripeToActivation} seconds`);
        
        if (stripeToActivation < 0) {
          console.log(`      ⚠️  WARNING: Premium was activated BEFORE Stripe payment!`);
        } else if (stripeToActivation > 30) {
          console.log(`      ⚠️  WARNING: Activation took longer than 30 seconds!`);
        } else {
          console.log(`      ✅ Activation was reasonably fast`);
        }
      });

      // Get payment intents
      const payments = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 10
      });

      if (payments.data.length > 0) {
        console.log(`\n  Payment Intents: ${payments.data.length}`);
        payments.data.forEach((payment, i) => {
          console.log(`    Payment ${i + 1}:`);
          console.log(`      Amount: $${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
          console.log(`      Status: ${payment.status}`);
          console.log(`      Created: ${new Date(payment.created * 1000).toISOString()}`);
        });
      }
    }

  } catch (stripeError) {
    console.error('  ❌ Stripe error:', stripeError.message);
  }

  console.log('\n' + '='.repeat(80));
}

checkAdamTimeline().catch(console.error);
