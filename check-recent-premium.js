// Check if recent Stripe customers have premium activated
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkRecentPremium() {
  console.log('🔍 Checking recent Stripe customers and their premium status...\n');

  try {
    // Get recent subscriptions from Stripe (last 7 days)
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
    const subscriptions = await stripe.subscriptions.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
      expand: ['data.customer']
    });

    console.log(`📊 Found ${subscriptions.data.length} recent subscriptions\n`);

    for (const sub of subscriptions.data) {
      const customer = sub.customer;
      const email = customer.email;
      const status = sub.status;
      const created = new Date(sub.created * 1000).toLocaleString();

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📧 Email: ${email}`);
      console.log(`🆔 Stripe Customer ID: ${customer.id}`);
      console.log(`📅 Subscription Created: ${created}`);
      console.log(`💳 Status: ${status}`);
      console.log(`💰 Amount: ${(sub.items.data[0].price.unit_amount / 100).toFixed(2)} ${sub.items.data[0].price.currency.toUpperCase()}`);

      // Check database premium status
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, is_premium, stripe_customer_id, stripe_subscription_id')
        .eq('email', email)
        .single();

      if (error || !user) {
        console.log(`❌ Database Status: USER NOT FOUND in database`);
        console.log(`   ⚠️ This user needs to sign in to StudyMaxx to create their account\n`);
        continue;
      }

      console.log(`✅ Database Status: User found`);
      console.log(`   🎯 Premium Active: ${user.is_premium ? '✅ YES' : '❌ NO'}`);
      console.log(`   🔗 Stripe Customer ID: ${user.stripe_customer_id || 'Not set'}`);
      console.log(`   📋 Stripe Subscription ID: ${user.stripe_subscription_id || 'Not set'}`);

      // Check if there's a mismatch
      if (status === 'active' && !user.is_premium) {
        console.log(`   ⚠️ MISMATCH: Stripe shows active but database shows NOT premium`);
        console.log(`   💡 Recommendation: Run webhook replay or manual activation`);
      } else if (status === 'active' && user.is_premium) {
        console.log(`   ✅ CORRECT: Premium properly activated`);
      }

      console.log('');
    }

    // Also check for any users with is_premium = true
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 All Premium Users in Database:\n');

    const { data: premiumUsers, error: premiumError } = await supabase
      .from('users')
      .select('id, email, is_premium, stripe_customer_id, stripe_subscription_id, created_at')
      .eq('is_premium', true)
      .order('created_at', { ascending: false });

    if (premiumError) {
      console.error('Error fetching premium users:', premiumError);
      return;
    }

    if (premiumUsers.length === 0) {
      console.log('❌ No premium users found in database');
    } else {
      console.log(`✅ Found ${premiumUsers.length} premium user(s):\n`);
      
      for (const user of premiumUsers) {
        console.log(`📧 ${user.email}`);
        console.log(`   🆔 User ID: ${user.id}`);
        console.log(`   🔗 Stripe Customer: ${user.stripe_customer_id || 'Not set'}`);
        console.log(`   📋 Subscription: ${user.stripe_subscription_id || 'Not set'}`);
        console.log(`   📅 Account Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRecentPremium();
