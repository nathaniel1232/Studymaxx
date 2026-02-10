/**
 * Check premium status for a specific user
 * Usage: node check-user-premium.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
  console.log('\n🔍 Checking user:', email);
  console.log('═'.repeat(60));
  
  try {
    // Get user from auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found in auth');
      return;
    }
    
    console.log('✅ User found in auth:');
    console.log('  - ID:', user.id);
    console.log('  - Email:', user.email);
    console.log('  - Created:', user.created_at);
    
    // Get user from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching from users table:', userError.message);
      return;
    }
    
    if (!userData) {
      console.log('❌ User not found in users table');
      return;
    }
    
    console.log('\n📊 Premium Status:');
    console.log('  - is_premium:', userData.is_premium);
    console.log('  - subscription_tier:', userData.subscription_tier);
    console.log('  - premium_expires_at:', userData.premium_expires_at);
    console.log('  - stripe_customer_id:', userData.stripe_customer_id || 'NOT SET');
    console.log('  - stripe_subscription_id:', userData.stripe_subscription_id || 'NOT SET');
    
    if (userData.is_premium) {
      console.log('\n✅ User HAS premium access');
    } else {
      console.log('\n❌ User DOES NOT have premium access');
      console.log('\n🔧 To fix manually:');
      console.log(`   node fix-single-user.js "${email}"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check the specific user
checkUser('servicesflh@gmail.com');
