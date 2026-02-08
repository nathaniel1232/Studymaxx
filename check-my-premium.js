const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkMyPremium() {
  console.log('🔍 Checking your premium status...\n');
  
  // Get all users to see who you might be
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📋 All users in database:\n');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email || 'No email'}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Premium: ${user.is_premium ? '✅ YES' : '❌ NO'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });

  // Check for owner user
  const owner = users.find(u => u.email === 'studymaxxer@gmail.com');
  if (owner) {
    console.log('👑 Owner account found!');
    console.log(`   Premium status: ${owner.is_premium ? '✅ YES' : '❌ NO (will be granted automatically)'}`);
  }
}

checkMyPremium().catch(console.error);
