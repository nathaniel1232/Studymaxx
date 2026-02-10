const https = require('https');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

// Test configurations
const BASE_URL = 'http://localhost:3000';
const tests = [];
let passed = 0;
let failed = 0;

// Helper to make HTTP requests
async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : require('http');
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Test 1: Server Health Check
tests.push({
  name: 'Server Health Check',
  run: async () => {
    try {
      const res = await request(`${BASE_URL}/`);
      if (res.status === 200) {
        return { success: true, message: 'Server is running' };
      }
      return { success: false, message: `Unexpected status: ${res.status}` };
    } catch (err) {
      return { success: false, message: `Cannot connect: ${err.message}` };
    }
  }
});

// Test 2: OpenAI API Key Check
tests.push({
  name: 'OpenAI API Key Validation',
  run: async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, message: 'OPENAI_API_KEY not found in environment' };
    }
    
    if (!apiKey.startsWith('sk-')) {
      return { success: false, message: 'Invalid OpenAI API key format' };
    }
    
    try {
      // Test with OpenAI API
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      };
      
      const res = await request('https://api.openai.com/v1/models', options);
      if (res.status === 200) {
        return { success: true, message: 'OpenAI API key is valid' };
      }
      return { success: false, message: `API returned status ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
});

// Test 3: Vertex AI Configuration
tests.push({
  name: 'Vertex AI Configuration',
  run: async () => {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!projectId) {
      return { success: false, message: 'VERTEX_AI_PROJECT_ID not set' };
    }
    
    if (!credentials) {
      return { success: false, message: 'GOOGLE_APPLICATION_CREDENTIALS not set' };
    }
    
    try {
      // Check if it's JSON
      if (credentials.startsWith('{')) {
        const creds = JSON.parse(credentials);
        if (creds.type === 'service_account' && creds.project_id === projectId) {
          return { success: true, message: `Vertex AI configured for project: ${projectId}` };
        }
        return { success: false, message: 'Credentials JSON structure invalid' };
      }
      return { success: true, message: 'Credentials file path set (assuming valid)' };
    } catch (err) {
      return { success: false, message: `Invalid credentials JSON: ${err.message}` };
    }
  }
});

// Test 4: Deepgram API Key
tests.push({
  name: 'Deepgram API Key',
  run: async () => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return { success: false, message: 'DEEPGRAM_API_KEY not set' };
    }
    
    if (apiKey.length < 20) {
      return { success: false, message: 'Deepgram API key looks invalid (too short)' };
    }
    
    return { success: true, message: 'Deepgram API key found' };
  }
});

// Test 5: Supabase Configuration
tests.push({
  name: 'Supabase Configuration',
  run: async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url) {
      return { success: false, message: 'NEXT_PUBLIC_SUPABASE_URL not set' };
    }
    
    if (!anonKey) {
      return { success: false, message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY not set' };
    }
    
    try {
      const res = await request(`${url}/rest/v1/`);
      if (res.status === 200 || res.status === 401) {
        return { success: true, message: 'Supabase endpoint reachable' };
      }
      return { success: false, message: `Unexpected status: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
});

// Test 6: Stripe Configuration
tests.push({
  name: 'Stripe Configuration',
  run: async () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!secretKey) {
      return { success: false, message: 'STRIPE_SECRET_KEY not set' };
    }
    
    if (!pubKey) {
      return { success: false, message: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set' };
    }
    
    if (!secretKey.startsWith('sk_')) {
      return { success: false, message: 'Invalid Stripe secret key format' };
    }
    
    if (!pubKey.startsWith('pk_')) {
      return { success: false, message: 'Invalid Stripe publishable key format' };
    }
    
    return { success: true, message: 'Stripe keys configured correctly' };
  }
});

// Test 7: Resend API Key
tests.push({
  name: 'Resend Email Configuration',
  run: async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, message: 'RESEND_API_KEY not set' };
    }
    
    if (!apiKey.startsWith('re_')) {
      return { success: false, message: 'Invalid Resend API key format' };
    }
    
    return { success: true, message: 'Resend API key found' };
  }
});

// Run all tests
async function runTests() {
  log('\n🧪 StudyMaxx API & Configuration Tests\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  for (const test of tests) {
    process.stdout.write(`\nTesting: ${test.name}... `);
    
    try {
      const result = await test.run();
      
      if (result.success) {
        log('✅ PASS', 'green');
        log(`   ${result.message}`, 'green');
        passed++;
      } else {
        log('❌ FAIL', 'red');
        log(`   ${result.message}`, 'red');
        failed++;
      }
    } catch (err) {
      log('❌ ERROR', 'red');
      log(`   ${err.message}`, 'red');
      failed++;
    }
  }
  
  log('\n' + '=' .repeat(60), 'cyan');
  log(`\n📊 Results: ${passed} passed, ${failed} failed`, passed === tests.length ? 'green' : 'yellow');
  
  if (failed > 0) {
    log('\n⚠️  Some tests failed. Check your .env.local file.', 'yellow');
    process.exit(1);
  } else {
    log('\n✅ All tests passed! Your APIs are configured correctly.', 'green');
    process.exit(0);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run tests
runTests().catch(err => {
  log(`\n❌ Test runner failed: ${err.message}`, 'red');
  process.exit(1);
});
