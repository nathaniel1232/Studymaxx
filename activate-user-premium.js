#!/usr/bin/env node

const https = require('https');

const email = process.argv[2] || 'wardahasif6@gmail.com';
const supabaseUrl = 'https://zvcawkxlhzhldhydxliv.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Y2F3a3hsaHpobGRoeWR4bGl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc0MjAwMCwiZXhwIjoyMDgyMzE4MDAwfQ.JHQ5XQudAqiAp3SkpKO5E_XSQINcXvIDbxt0Bt7LVHM';

console.log(`\n✨ Activating premium for: ${email}\n`);

const updateData = JSON.stringify({
  is_premium: true
});

const options = {
  hostname: 'zvcawkxlhzhldhydxliv.supabase.co',
  path: `/rest/v1/users?email=eq.${encodeURIComponent(email)}`,
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Length': Buffer.byteLength(updateData),
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log('✅ Premium activated successfully!');
        console.log('Updated user:', result[0] || 'User updated');
      } catch (e) {
        console.log('✅ Premium activated successfully!');
        console.log('Response:', data);
      }
    } else {
      console.error(`❌ Error (${res.statusCode}):`, data);
    }
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  process.exit(1);
});

req.write(updateData);
req.end();
