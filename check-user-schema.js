#!/usr/bin/env node

const https = require('https');

const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Y2F3a3hsaHpobGRoeWR4bGl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc0MjAwMCwiZXhwIjoyMDgyMzE4MDAwfQ.JHQ5XQudAqiAp3SkpKO5E_XSQINcXvIDbxt0Bt7LVHM';

const options = {
  hostname: 'zvcawkxlhzhldhydxliv.supabase.co',
  path: '/rest/v1/users?limit=1&select=*',
  method: 'GET',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      if (users.length > 0) {
        console.log('User columns:', Object.keys(users[0]).sort());
      } else {
        console.log('No users found');
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});
