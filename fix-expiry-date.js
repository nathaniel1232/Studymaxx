require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixExpiryDate() {
  const userId = '1f6dcc5b-cd9e-4e30-a551-bcadec954385';
  const subscriptionId = 'sub_1SzeLLPDFQXMY7ipvACZX9vy';
  
  console.log('\n🔧 Fixing expiry date...\n');
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Get period end from items
    const periodEnd = subscription.items?.data?.[0]?.current_period_end;
    
    if (!periodEnd) {
      console.error('❌ Could not find period end');
      return;
    }
    
    const expiryDate = new Date(periodEnd * 1000).toISOString();
    
    console.log('Period end timestamp:', periodEnd);
    console.log('Expiry date:', expiryDate);
    console.log('');
    
    const { data, error } = await supabase
      .from('users')
      .update({ premium_expires_at: expiryDate })
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error('❌ Failed:', error);
    } else {
      console.log('✅ Expiry date updated!');
      console.log('Updated data:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixExpiryDate();
