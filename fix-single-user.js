/**
 * Fix Premium for a Single User
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUser(email) {
  console.log(`\n🔧 Fixing premium for: ${email}\n`);

  try {
    // Find user
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

    // Update to premium
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_premium: true,
        subscription_tier: 'premium',
        premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .eq('id', user.id);

    if (updateError) {
      console.log(`\n❌ Failed to update: ${updateError.message}`);
      return;
    }

    console.log(`\n✅ SUCCESS! Premium activated for ${email}`);
    console.log(`   is_premium: TRUE`);
    console.log(`   subscription_tier: premium`);
    console.log(`   premium_expires_at: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}`);
    console.log(`\n📝 User must logout and login again to see changes`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'kos.saren@gmail.com';
fixUser(email);
