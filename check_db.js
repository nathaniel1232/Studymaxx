const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
const env = {};
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('email, is_premium')
      .order('created_at', { ascending: false });
    
    console.log('=== DATABASE USERS & PREMIUM STATUS ===\n');
    users.forEach(u => {
      const status = u.is_premium ? 'PREMIUM ✅' : 'FREE ❌';
      console.log(status + ' | ' + (u.email || 'No email'));
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
