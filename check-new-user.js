require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const userId = '56947cda-5231-46bc-b903-7f21d5d5310d';
  const email = 'justiltiktok@gmail.com';
  
  console.log('\n🔍 Checking user in database...\n');
  console.log('User ID:', userId);
  console.log('Email:', email);
  console.log('');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log('❌ USER NOT FOUND IN DATABASE');
      console.log('This means webhook did NOT create the user');
    } else {
      console.log('❌ Database error:', error);
    }
  } else {
    console.log('✅ User exists in database:');
    console.log('');
    console.log('  is_premium:', data.is_premium);
    console.log('  stripe_customer_id:', data.stripe_customer_id);
    console.log('  stripe_subscription_id:', data.stripe_subscription_id);
    console.log('  premium_expires_at:', data.premium_expires_at);
    console.log('  created_at:', data.created_at);
    console.log('');
    
    if (data.is_premium) {
      console.log('✅ User IS premium');
    } else {
      console.log('❌ User is NOT premium - WEBHOOK FAILED');
    }
  }
}

checkUser();
