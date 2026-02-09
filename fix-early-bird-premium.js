// FIX: Activate premium for all early bird (grandfathered) users
// Run with environment variables explicitly set

const { createClient } = require('@supabase/supabase-js');

// Read from .env.local file manually or use these hardcoded values
const fs = require('fs');
const path = require('path');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Try reading from .env.local if not in environment
if (!supabaseUrl || !supabaseKey) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = trimmed.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        supabaseKey = trimmed.split('=')[1].trim().replace(/['"]/g, '');
      }
    }
  } catch (err) {
    console.log('Could not read .env.local, using environment variables');
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEarlyBirdPremium() {
  console.log('🔍 Finding early bird users...');

  // Find all users with is_grandfathered = true
  const { data: grandfatheredUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, email, is_premium, is_grandfathered')
    .eq('is_grandfathered', true);

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError);
    process.exit(1);
  }

  if (!grandfatheredUsers || grandfatheredUsers.length === 0) {
    console.log('✅ No early bird users found');
    return;
  }

  console.log(`\n📊 Found ${grandfatheredUsers.length} early bird user(s):\n`);
  grandfatheredUsers.forEach(u => {
    console.log(`  - ${u.email || 'No email'} | Premium: ${u.is_premium ? '✅' : '❌'} | Grandfathered: ${u.is_grandfathered ? '✅' : '❌'}`);
  });

  // Filter users who need premium activated
  const needsActivation = grandfatheredUsers.filter(u => !u.is_premium);

  if (needsActivation.length === 0) {
    console.log('\n✅ All early bird users already have premium active!');
    return;
  }

  console.log(`\n🔧 Activating premium for ${needsActivation.length} early bird user(s)...\n`);

  // Activate premium for each
  for (const user of needsActivation) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_premium: true })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Failed to activate premium for ${user.email}:`, updateError);
    } else {
      console.log(`✅ Premium activated for ${user.email || user.id}`);
    }
  }

  console.log('\n🎉 Done! All early bird users now have premium access.\n');
}

fixEarlyBirdPremium().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
