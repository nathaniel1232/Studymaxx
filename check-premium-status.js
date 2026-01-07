const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// Split by any newline type and process
envContent.split(/\r?\n/).forEach(line => {
  line = line.trim();
  // Skip comments and empty lines
  if (line.startsWith('#') || !line) return;
  
  const equalIndex = line.indexOf('=');
  if (equalIndex > 0) {
    const key = line.substring(0, equalIndex).trim();
    const value = line.substring(equalIndex + 1).trim().replace(/\/$/, ''); // Remove trailing slash
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPremiumStatus() {
  console.log('🔍 Checking premium user status...\n');

  // Get all users with their premium details
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users found in database');
    return;
  }

  console.log(`📊 Total users: ${users.length}\n`);

  // Show first user to see available columns
  console.log('📋 Available user columns:', Object.keys(users[0]).join(', '), '\n');

  // Count premium users
  const premiumUsers = users.filter(u => u.is_premium);

  console.log(`✅ Premium users: ${premiumUsers.length}\n`);

  // Show all users with their premium status
  console.log('👤 ALL USERS:');
  console.log('=' .repeat(80));
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Premium: ${user.is_premium ? '✅ YES' : '❌ NO'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });

  console.log('\n✅ Premium status check complete!');
}

checkPremiumStatus().catch(console.error);
