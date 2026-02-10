/**
 * Check Stripe payment for user
 * Usage: node check-stripe-payment.js
 */

require('dotenv').config({ path: ['.env.local', '.env'] });
const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ Missing STRIPE_SECRET_KEY');
  console.log('\nAvailable env vars:');
  console.log('  - STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'NOT SET');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-01-28.clover',
});

async function checkStripeCustomer(email) {
  console.log('\n🔍 Checking Stripe for:', email);
  console.log('═'.repeat(60));
  
  try {
    // Search for customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });
    
    if (customers.data.length === 0) {
      console.log('❌ No Stripe customer found with this email');
      console.log('\n💡 This means:');
      console.log('   1. The payment might not have completed');
      console.log('   2. Different email was used in Stripe');
      console.log('   3. Customer was deleted');
      return;
    }
    
    console.log(`✅ Found ${customers.data.length} customer(s):\n`);
    
    for (const customer of customers.data) {
      console.log(`Customer ID: ${customer.id}`);
      console.log(`Email: ${customer.email}`);
      console.log(`Created: ${new Date(customer.created * 1000).toISOString()}`);
      
      // Get subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });
      
      console.log(`\n📋 Subscriptions (${subscriptions.data.length}):`);
      
      if (subscriptions.data.length === 0) {
        console.log('  ❌ No subscriptions found');
      } else {
        for (const sub of subscriptions.data) {
          console.log(`\n  Subscription ID: ${sub.id}`);
          console.log(`  Status: ${sub.status}`);
          console.log(`  Current period: ${new Date(sub.current_period_start * 1000).toISOString()} → ${new Date(sub.current_period_end * 1000).toISOString()}`);
          console.log(`  Cancel at period end: ${sub.cancel_at_period_end}`);
          
          if (sub.status === 'active') {
            console.log('  ✅ ACTIVE subscription');
          } else {
            console.log(`  ⚠️ Subscription is ${sub.status}`);
          }
        }
      }
      
      // Check recent checkout sessions
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 5,
      });
      
      console.log(`\n💳 Recent Checkout Sessions (${sessions.data.length}):`);
      for (const session of sessions.data) {
        console.log(`\n  Session ID: ${session.id}`);
        console.log(`  Status: ${session.status}`);
        console.log(`  Payment status: ${session.payment_status}`);
        console.log(`  Created: ${new Date(session.created * 1000).toISOString()}`);
        console.log(`  Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
        
        if (session.payment_status === 'paid' && session.status === 'complete') {
          console.log('  ✅ PAID AND COMPLETED');
        } else {
          console.log(`  ⚠️ NOT COMPLETED (status: ${session.status}, payment: ${session.payment_status})`);
        }
      }
      
      console.log('\n' + '═'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Stripe Error:', error.message);
  }
}

checkStripeCustomer('servicesflh@gmail.com');
