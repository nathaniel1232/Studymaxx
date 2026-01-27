const { createClient } = require('@supabase/supabase-js');

// Manually load env vars from .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPremium() {
  try {
    // Check studymaxxer@gmail.com
    console.log('Looking for studymaxxer@gmail.com...');
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, email, is_premium')
      .eq('email', 'studymaxxer@gmail.com');

    if (findError) {
      console.error('Error finding user:', findError);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('User not found');
      process.exit(0);
    }

    const user = users[0];
    console.log(`Found: ${user.email}`);
    console.log(`Current premium status: ${user.is_premium}`);

    // Activate premium
    console.log('\nActivating premium...');
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ 
        is_premium: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Error updating:', updateError);
      process.exit(1);
    }

    console.log('✅ SUCCESS! Premium activated for studymaxxer@gmail.com');
    console.log('Updated data:', updateData);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPremium();
