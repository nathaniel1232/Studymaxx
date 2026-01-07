const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    },
    global: {
      fetch: (...args) => {
        const [url, options = {}] = args;
        options.agent = undefined; // Disable SSL verification for local dev
        return fetch(url, options);
      }
    }
  }
);

async function check() {
  console.log('🔍 Checking premium users...\n');
  
  const { data: premium, error } = await supabase
    .from('users')
    .select('id, email, is_premium, stripe_customer_id, created_at')
    .eq('is_premium', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Found ${premium.length} premium users:\n`);
  premium.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   Premium: ✅ YES`);
    console.log(`   Stripe ID: ${user.stripe_customer_id || '❌ Not linked'}`);
    console.log(`   Joined: ${new Date(user.created_at).toLocaleDateString()}\n`);
  });
}

check().catch(console.error);
