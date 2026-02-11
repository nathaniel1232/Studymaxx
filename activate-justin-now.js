require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function activateJustinNow() {
  const userId = '56947cda-5231-46bc-b903-7f21d5d5310d';
  const subscriptionId = 'sub_1SzeexPDFQXMY7ipRu8tXqsr';
  const email = 'justiltiktok@gmail.com';
  
  console.log('\n🚨 EMERGENCY ACTIVATION\n');
  console.log('User:', email);
  console.log('');
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const periodEnd = subscription.items?.data?.[0]?.current_period_end;
    const expiryDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
    const customerId = subscription.customer;
    
    console.log('Stripe data:');
    console.log('  Customer ID:', customerId);
    console.log('  Subscription ID:', subscriptionId);
    console.log('  Expires:', expiryDate);
    console.log('');
    
    const { data, error } = await supabase
      .from('users')
      .update({
        is_premium: true,
        premium_expires_at: expiryDate,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_tier: 'premium'
      })
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error('❌ Failed:', error);
    } else {
      console.log('✅✅✅ SUCCESS! User activated as Premium');
      console.log('');
      console.log('User can now use premium features!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

activateJustinNow();
