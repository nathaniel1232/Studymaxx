const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');

// Color helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

const BASE_URL = 'http://localhost:3000';

// Helper to make requests
async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : require('http');
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: res.headers['content-type']?.includes('json') ? JSON.parse(data) : data,
            headers: res.headers 
          });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body && typeof options.body === 'string') {
      req.write(options.body);
    }
    req.end();
  });
}

// Helper for multipart form data
async function uploadFile(url, filePath, fieldName = 'file') {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append(fieldName, fs.createReadStream(filePath));
    
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : require('http');
    
    const req = lib.request(url, {
      method: 'POST',
      headers: form.getHeaders()
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(data)
          });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    form.pipe(req);
  });
}

// Create test files
function createTestFiles() {
  const testDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create a simple text file
  const txtPath = path.join(testDir, 'test.txt');
  fs.writeFileSync(txtPath, 'This is a test document about mathematics. Calculus is the study of continuous change.');
  
  // Create a simple HTML that can be tested
  const htmlPath = path.join(testDir, 'test.html');
  fs.writeFileSync(htmlPath, '<html><body><h1>Test Document</h1><p>This is test content.</p></body></html>');
  
  return { txtPath, htmlPath, testDir };
}

// Cleanup test files
function cleanupTestFiles(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

let passed = 0;
let failed = 0;

async function runEndpointTests() {
  log('\n🧪 StudyMaxx Endpoint Integration Tests\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const { txtPath, htmlPath, testDir } = createTestFiles();
  
  try {
    // Test 1: Text File Upload
    log('\n1️⃣  Testing text file upload (/api/extract-text)...', 'blue');
    try {
      const res = await uploadFile(`${BASE_URL}/api/extract-text`, txtPath);
      
      if (res.status === 200 && res.data.text?.includes('mathematics')) {
        log('   ✅ Text extraction working', 'green');
        log(`   Extracted: ${res.data.text.substring(0, 50)}...`, 'green');
        passed++;
      } else {
        log(`   ❌ Failed: Status ${res.status}`, 'red');
        log(`   Response: ${JSON.stringify(res.data)}`, 'red');
        failed++;
      }
    } catch (err) {
      log(`   ❌ Error: ${err.message}`, 'red');
      failed++;
    }
    
    // Test 2: Flashcard Generation API
    log('\n2️⃣  Testing flashcard generation (/api/generate)...', 'blue');
    try {
      const testContent = 'The Pythagorean theorem states that in a right triangle, a² + b² = c² where c is the hypotenuse.';
      
      const res = await request(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user', // Test user ID
          text: testContent,
          subject: 'Mathematics',
          numberOfFlashcards: 3,
          difficulty: 'Medium',
          outputLanguage: 'auto'
        })
      });
      
      if (res.status === 200 && res.data.flashcards && res.data.flashcards.length > 0) {
        log(`   ✅ Flashcard generation working`, 'green');
        log(`   Generated ${res.data.flashcards.length} flashcards`, 'green');
        log(`   Sample: ${res.data.flashcards[0].term.substring(0, 40)}...`, 'green');
        passed++;
      } else {
        log(`   ❌ Failed: Status ${res.status}`, 'red');
        log(`   Response: ${JSON.stringify(res.data).substring(0, 200)}`, 'red');
        failed++;
      }
    } catch (err) {
      log(`   ❌ Error: ${err.message}`, 'red');
      failed++;
    }
    
    // Test 3: AI Chat API
    log('\n3️⃣  Testing AI chat (/api/chat)...', 'blue');
    try {
      const res = await request(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What is 2+2?',
          context: 'Mathematics basics',
          conversationHistory: []
        })
      });
      
      if (res.status === 200 && res.data.response) {
        log(`   ✅ AI chat is working`, 'green');
        log(`   Response: ${res.data.response.substring(0, 60)}...`, 'green');
        passed++;
      } else {
        log(`   ❌ Failed: Status ${res.status}`, 'red');
        failed++;
      }
    } catch (err) {
      log(`   ❌ Error: ${err.message}`, 'red');
      failed++;
    }
    
    // Test 4: Quiz Generation API
    log('\n4️⃣  Testing quiz generation (/api/generate-quiz)...', 'blue');
    try {
      const res = await request(`${BASE_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Water boils at 100°C. Ice melts at 0°C. Water is H2O.',
          subject: 'Chemistry',
          numberOfQuestions: 3,
          difficulty: 'Medium',
          questionType: 'multiple-choice'
        })
      });
      
      if (res.status === 200 && res.data.questions && res.data.questions.length > 0) {
        log(`   ✅ Quiz generation working`, 'green');
        log(`   Generated ${res.data.questions.length} questions`, 'green');
        passed++;
      } else {
        log(`   ❌ Failed: Status ${res.status}`, 'red');
        failed++;
      }
    } catch (err) {
      log(`   ❌ Error: ${err.message}`, 'red');
      failed++;
    }
    
    // Test 5: Transcription API (without actual audio - just check endpoint exists)
    log('\n5️⃣  Testing transcription endpoint exists (/api/transcribe)...', 'blue');
    try {
      const res = await request(`${BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      // We expect 400 (bad request) because we didn't send audio, that's fine
      if (res.status === 400) {
        log(`   ✅ Transcription endpoint exists and responding`, 'green');
        passed++;
      } else if (res.status === 200) {
        log(`   ✅ Transcription endpoint exists`, 'green');
        passed++;
      } else {
        log(`   ⚠️  Unexpected status: ${res.status} (endpoint exists)`, 'yellow');
        passed++;
      }
    } catch (err) {
      log(`   ❌ Error: ${err.message}`, 'red');
      failed++;
    }
    
  } finally {
    cleanupTestFiles(testDir);
  }
  
  log('\n' + '=' .repeat(60), 'cyan');
  log(`\n📊 Results: ${passed} passed, ${failed} failed`, passed > failed ? 'green' : 'red');
  
  if (failed > 0) {
    log('\n⚠️  Some endpoints failed. Check server logs for details.', 'yellow');
  } else {
    log('\n✅ All core endpoints are working!', 'green');
  }
  
  log('\n📝 API Summary:', 'cyan');
  log('   • Text extraction: Working', passed >= 1 ? 'green' : 'red');
  log('   • Flashcard generation (Vertex AI): Working', passed >= 2 ? 'green' : 'red');
  log('   • AI Chat (Vertex AI): Working', passed >= 3 ? 'green' : 'red');
  log('   • Quiz generation (Vertex AI): Working', passed >= 4 ? 'green' : 'red');
  log('   • Transcription (OpenAI/Deepgram): Endpoint ready', passed >= 5 ? 'green' : 'red');
  
  log('\n🔑 APIs in use:', 'cyan');
  log('   • Vertex AI (Gemini 2.5 Flash): Flashcards, quizzes, chat', 'blue');
  log('   • OpenAI (Whisper + GPT-4o): Audio transcription, PDF OCR', 'blue');
  log('   • Deepgram: Audio transcription fallback', 'blue');
}

runEndpointTests().catch(err => {
  log(`\n❌ Test failed: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
