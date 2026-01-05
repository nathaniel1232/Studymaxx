const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
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
    const email = process.argv[2];
    
    if (!email) {
      console.error('Usage: node remove-premium.js <email>');
      process.exit(1);
    }
    
    console.log(`Removing premium from ${email}...\n`);
    
    const { error } = await supabase
      .from('users')
      .update({ is_premium: false })
      .eq('email', email);
    
    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
    
    console.log(`✅ Done! Removed premium from ${email}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
