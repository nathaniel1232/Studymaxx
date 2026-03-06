/**
 * CHECK PAYPAL PAYMENTS - Find PayPal purchases that may not have activated premium
 * Run: node check-paypal-payments.js
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPaypalPayments() {
  console.log('\n🔍 Checking for PayPal payments in Stripe...\n');

  try {
    // Get recent checkout sessions (last 100)
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });

    const paypalSessions = sessions.data.filter(s =>
      s.payment_method_types?.includes('paypal') ||
      (s.payment_method_configuration_details?.id) // dynamic methods
    );

    console.log(`Total sessions checked: ${sessions.data.length}`);
    console.log(`Sessions with PayPal: ${paypalSessions.length}\n`);

    // Also check payment intents with paypal
    const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
    const paypalPIs = paymentIntents.data.filter(pi =>
      pi.payment_method_types?.includes('paypal')
    );
    console.log(`PaymentIntents with PayPal type: ${paypalPIs.length}\n`);

    // Check all recent charges for paypal
    const charges = await stripe.charges.list({ limit: 100 });
    const paypalCharges = charges.data.filter(c =>
      c.payment_method_details?.type === 'paypal'
    );

    console.log(`Charges with PayPal method: ${paypalCharges.length}\n`);

    if (paypalCharges.length === 0 && paypalSessions.length === 0) {
      console.log('ℹ️  No PayPal payments found in recent Stripe data.');
      console.log('This means the user may have tried to pay via PayPal but it was blocked');
      console.log('(checkout only accepted "card" payment type before this fix).\n');
    }

    for (const charge of paypalCharges) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PayPal Charge:');
      console.log('  ID:', charge.id);
      console.log('  Amount:', (charge.amount / 100).toFixed(2), charge.currency?.toUpperCase());
      console.log('  Email:', charge.billing_details?.email || 'N/A');
      console.log('  Created:', new Date(charge.created * 1000).toLocaleString());
      console.log('  Status:', charge.status);

      if (charge.billing_details?.email) {
        const { data: user } = await supabase
          .from('users')
          .select('email, is_premium')
          .eq('email', charge.billing_details.email)
          .single();

        if (user) {
          console.log(`  Premium status: ${user.is_premium ? '✅ YES' : '❌ NO - needs activation!'}`);
          if (!user.is_premium) {
            console.log(`  ⚠️  Run: node scripts/activate-premium.js ${user.email}`);
          }
        } else {
          console.log('  User not found in database');
        }
      }
    }

    // Check recent subscriptions and their payment methods
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Recent subscriptions (last 20):');
    const subscriptions = await stripe.subscriptions.list({ limit: 20 });
    for (const sub of subscriptions.data) {
      const pmId = sub.default_payment_method;
      let pmType = 'unknown';
      if (pmId && typeof pmId === 'string') {
        try {
          const pm = await stripe.paymentMethods.retrieve(pmId);
          pmType = pm.type;
        } catch (e) {}
      }
      const customer = await stripe.customers.retrieve(sub.customer);
      const email = customer.deleted ? 'deleted' : customer.email;
      console.log(`  ${email} | ${pmType} | ${sub.status} | Created: ${new Date(sub.created * 1000).toLocaleDateString()}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPaypalPayments();
