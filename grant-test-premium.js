// Grant premium to test users until Saturday
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function grantPremium() {
  const users = [
    'lukasvantonsen@gmail.com',
    'sverrefh2011@gmail.com'
  ];
  
  // Saturday at end of day (2026-02-15 23:59:59)
  const saturday = new Date('2026-02-15T23:59:59Z');
  
  console.log(`Granting premium until ${saturday.toISOString()}\n`);
  
  for (const email of users) {
    console.log(`Processing: ${email}`);
    
    const { data, error } = await supabase
      .from('users')
      .update({
        is_premium: true,
        premium_expires_at: saturday.toISOString()
      })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ⚠️  User not found`);
    } else {
      console.log(`  ✅ Premium granted`);
      console.log(`     Expires: ${saturday.toLocaleString('no-NO')}`);
    }
  }
  
  console.log('\n✅ Premium grants complete');
}

grantPremium().catch(console.error);
