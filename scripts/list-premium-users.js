#!/usr/bin/env node

/**
 * CLI script to list all premium users
 * Usage: node scripts/list-premium-users.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local file manually
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
      env[key.trim()] = value;
    }
  });
  
  return env;
}

async function listPremiumUsers() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔍 Fetching premium users...\n');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, is_premium, created_at')
      .eq('is_premium', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('📭 No premium users found');
      return;
    }

    console.log(`✅ Found ${users.length} premium user(s):\n`);
    console.log('═'.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Premium: ${user.is_premium ? '✓' : '✗'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\nTotal: ${users.length} premium user(s)`);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

listPremiumUsers();
