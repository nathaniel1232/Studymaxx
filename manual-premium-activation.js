require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function activatePremium() {
  const userId = '1f6dcc5b-cd9e-4e30-a551-bcadec954385';
  const email = 'ntlmotivation@gmail.com';
  
  console.log('\n🔧 Manually activating premium for:', email);
  console.log('User ID:', userId);
  console.log('');
  
  try {
    // Get Stripe customer and subscription
    console.log('📡 Fetching Stripe data...');
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      console.error('❌ No Stripe customer found');
      return;
    }
    
    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({ 
      customer: customer.id, 
      limit: 1,
      status: 'active'
    });
    
    if (subscriptions.data.length === 0) {
      console.error('❌ No active subscription found');
      return;
    }
    
    const subscription = subscriptions.data[0];
    
    let periodEnd = null;
    if (subscription.current_period_end) {
      periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    }
    
    console.log('✅ Found Stripe data:');
    console.log('  Customer ID:', customer.id);
    console.log('  Subscription ID:', subscription.id);
    console.log('  Status:', subscription.status);
    console.log('  Period ends:', periodEnd || 'N/A');
    console.log('  Raw period_end:', subscription.current_period_end);
    console.log('');
    
    // Check if user exists in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    const updateData = {
      is_premium: true,
      premium_expires_at: periodEnd,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      subscription_tier: 'premium'
    };
    
    if (existingUser) {
      console.log('📝 Updating existing user...');
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('❌ Failed to update user:', error);
      } else {
        console.log('✅✅✅ SUCCESS! User upgraded to Premium');
        console.log('Updated data:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('📝 Creating new user...');
      const insertData = {
        id: userId,
        email: email,
        ...updateData,
        is_grandfathered: false
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert(insertData)
        .select();
      
      if (error) {
        console.error('❌ Failed to create user:', error);
      } else {
        console.log('✅✅✅ SUCCESS! User created as Premium');
        console.log('Inserted data:', JSON.stringify(data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

activatePremium();
