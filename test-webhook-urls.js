require('dotenv').config({ path: '.env.local' });
const https = require('https');

const urls = [
  'https://www.studymaxx.net/api/stripe/webhook',
  'https://studymaxx.net/api/stripe/webhook',
  'https://studymaxx.vercel.app/api/stripe/webhook'
];

console.log('\n🔍 Testing webhook endpoints...\n');

urls.forEach(url => {
  const urlObj = new URL(url);
  
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname,
    method: 'GET',
    timeout: 5000
  };

  const req = https.request(options, (res) => {
    console.log(`${url}`);
    console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`  ${res.statusCode === 200 || res.statusCode === 405 ? '✅ Endpoint exists' : '❌ Endpoint not found'}`);
    console.log('');
  });

  req.on('error', (err) => {
    console.log(`${url}`);
    console.log(`  ❌ Error: ${err.message}`);
    console.log('');
  });

  req.on('timeout', () => {
    console.log(`${url}`);
    console.log(`  ⏱️  Timeout`);
    console.log('');
    req.destroy();
  });

  req.end();
});
