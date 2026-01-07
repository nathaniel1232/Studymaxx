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
    const value = line.substring(equalIndex + 1).trim().replace(/\/$/, '');
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdam() {
  console.log('🔍 Checking adamo.kozik@gmail.com...\n');

  // Search for Adam by email (case-insensitive)
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', '%kozik%');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No user found with "kozik" in email');
    return;
  }

  console.log(`Found ${users.length} user(s):\n`);
  
  users.forEach((user, i) => {
    console.log(`User ${i + 1}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Premium Status: ${user.is_premium ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  Account Created: ${user.created_at}`);
    console.log(`  Last Updated: ${user.updated_at}`);
    console.log(`  All columns:`, user);
    console.log('');
  });
}

checkAdam().catch(console.error);
