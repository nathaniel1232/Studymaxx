/**
 * Fix Premium for a Single User
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

async function fixUser(email) {
  console.log(`\n🔧 Fixing premium for: ${email}\n`);

  try {
    // Find user in Supabase
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, email, is_premium, stripe_customer_id, stripe_subscription_id')
      .eq('email', email);

    if (findError) {
      console.log(`❌ Error finding user: ${findError.message}`);
      return;
    }

    if (!users || users.length === 0) {
      console.log(`❌ User not found in Supabase`);
      return;
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Current is_premium: ${user.is_premium}`);
    console.log(`   Current stripe_customer_id: ${user.stripe_customer_id || 'NULL'}`);
    console.log(`   Current stripe_subscription_id: ${user.stripe_subscription_id || 'NULL'}`);

    // Get Stripe customer and subscription
    console.log('\n🔍 Checking Stripe...');
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let stripeCustomerId = user.stripe_customer_id;
    let stripeSubscriptionId = user.stripe_subscription_id;
    let premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (customers.data.length > 0) {
      const customer = customers.data[0];
      stripeCustomerId = customer.id;
      console.log(`✅ Found Stripe customer: ${customer.id}`);

      // Get active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        stripeSubscriptionId = subscription.id;
        
        // Safely parse the subscription end date
        if (subscription.current_period_end) {
          try {
            premiumExpiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          } catch (e) {
            console.log(`⚠️ Could not parse subscription end date, using default 30 days`);
            premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          }
        }
        
        console.log(`✅ Found active subscription: ${subscription.id}`);
        console.log(`   Expires: ${premiumExpiresAt}`);
      }
    }

    // Update to premium with Stripe IDs
    const updateData = {
      is_premium: true,
      subscription_tier: 'premium',
      premium_expires_at: premiumExpiresAt,
    };

    if (stripeCustomerId) {
      updateData.stripe_customer_id = stripeCustomerId;
    }

    if (stripeSubscriptionId) {
      updateData.stripe_subscription_id = stripeSubscriptionId;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.log(`\n❌ Failed to update: ${updateError.message}`);
      return;
    }

    console.log(`\n✅ SUCCESS! Premium activated for ${email}`);
    console.log(`   is_premium: TRUE`);
    console.log(`   subscription_tier: premium`);
    console.log(`   premium_expires_at: ${premiumExpiresAt}`);
    if (stripeCustomerId) console.log(`   stripe_customer_id: ${stripeCustomerId}`);
    if (stripeSubscriptionId) console.log(`   stripe_subscription_id: ${stripeSubscriptionId}`);
    console.log(`\n📝 User must logout and login again to see changes`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'kos.saren@gmail.com';
fixUser(email);
