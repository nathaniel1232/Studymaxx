const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('📄 Raw file content:');
console.log(envContent);
console.log('\n' + '='.repeat(80) + '\n');

const envVars = {};

envContent.split('\n').forEach((line, index) => {
  console.log(`Line ${index + 1}: "${line}"`);
  
  // Skip comments and empty lines
  if (line.trim().startsWith('#') || !line.trim()) return;
  
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/\/$/, '');
    envVars[key] = value;
    console.log(`  ✅ Parsed: ${key} = ${value.substring(0, 30)}...`);
  }
});

console.log('\n📋 Environment variables loaded:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', envVars.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
