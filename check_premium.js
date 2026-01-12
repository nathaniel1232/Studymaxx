const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndUpdatePremium() {
  try {
    // Check all premium users
    console.log('Checking all premium users...\n');
    const { data: premiumUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email, is_premium, stripe_customer_id, created_at')
      .eq('is_premium', true);

    if (checkError) {
      console.error('Error checking premium users:', checkError);
      process.exit(1);
    }

    console.log(`Found ${premiumUsers.length} premium users:\n`);
    premiumUsers.forEach(user => {
      console.log(`✓ ${user.email} - is_premium: ${user.is_premium}, stripe_customer_id: ${user.stripe_customer_id || 'N/A'}`);
    });

    // Find and activate rasmus.t.henriks1@gmail.com
    console.log('\n\nLooking for rasmus.t.henriks1@gmail.com...');
    const { data: rasmussData, error: rasmussError } = await supabase
      .from('users')
      .select('id, email, is_premium')
      .eq('email', 'rasmus.t.henriks1@gmail.com');

    if (rasmussError) {
      console.error('Error finding user:', rasmussError);
      process.exit(1);
    }

    if (!rasmussData || rasmussData.length === 0) {
      console.log('User rasmus.t.henriks1@gmail.com not found in database');
      process.exit(0);
    }

    const rasmussUser = rasmussData[0];
    console.log(`Found: ${rasmussUser.email}, current premium status: ${rasmussUser.is_premium}`);

    if (!rasmussUser.is_premium) {
      console.log('\nActivating premium for rasmus.t.henriks1@gmail.com...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', rasmussUser.id);

      if (updateError) {
        console.error('Error updating premium:', updateError);
        process.exit(1);
      }

      console.log('✅ Premium activated for rasmus.t.henriks1@gmail.com');
    } else {
      console.log('✓ rasmus.t.henriks1@gmail.com already has premium');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

checkAndUpdatePremium();
