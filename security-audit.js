// Security audit: Check for unauthorized data access
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use anon key to test anonymous access
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUnauthorizedAccess() {
  console.log('🔐 Security Audit: Testing unauthorized data access\n');
  
  // Test 1: Can anonymous users read all flashcard sets?
  console.log('1. Testing anonymous access to flashcard_sets...');
  const { data: sets, error: setsError, count } = await anonClient
    .from('flashcard_sets')
    .select('*', { count: 'exact' })
    .limit(5);
  
  if (setsError) {
    console.log('   ✅ SECURE: Anonymous access blocked');
    console.log(`      Error: ${setsError.message}`);
  } else {
    console.log('   ⚠️  WARNING: Anonymous users can access flashcard sets!');
    console.log(`      Found ${count || sets?.length} sets`);
    if (sets && sets.length > 0) {
      console.log('      Sample data:', {
        id: sets[0].id,
        name: sets[0].name,
        user_id: sets[0].user_id,
        is_shared: sets[0].is_shared
      });
    }
  }
  
  // Test 2: Can anonymous users read all users?
  console.log('\n2. Testing anonymous access to users table...');
  const { data: users, error: usersError } = await anonClient
    .from('users')
    .select('*')
    .limit(5);
  
  if (usersError) {
    console.log('   ✅ SECURE: Anonymous access blocked');
    console.log(`      Error: ${usersError.message}`);
  } else {
    console.log('   🚨 CRITICAL: Anonymous users can access user data!');
    console.log(`      Found ${users?.length} users`);
    if (users && users.length > 0) {
      console.log('      Sample data:', {
        email: users[0].email,
        is_premium: users[0].is_premium,
        stripe_customer_id: users[0].stripe_customer_id ? 'EXPOSED' : null
      });
    }
  }
  
  // Test 3: Can anonymous users access shared sets specifically?
  console.log('\n3. Testing anonymous access to SHARED flashcard sets...');
  const { data: sharedSets, error: sharedError } = await anonClient
    .from('flashcard_sets')
    .select('*')
    .eq('is_shared', true)
    .limit(5);
  
  if (sharedError) {
    console.log('   ❌ PROBLEM: Shared sets should be accessible!');
    console.log(`      Error: ${sharedError.message}`);
  } else {
    console.log('   ✅ CORRECT: Anonymous users CAN access shared sets');
    console.log(`      Found ${sharedSets?.length} shared sets`);
  }
  
  // Test 4: Check RLS policies
  console.log('\n4. Checking RLS policy configuration...');
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data: policies, error: policyError } = await serviceClient
    .rpc('pg_policies')
    .catch(() => ({ data: null, error: 'RPC not available' }));
  
  console.log('\n📊 Security Summary:');
  console.log('   - Flashcard sets: Check result above');
  console.log('   - Users table: Check result above');
  console.log('   - Shared sets: Check result above');
  console.log('\n💡 Recommendations:');
  console.log('   1. Ensure flashcard_sets has RLS that only allows:');
  console.log('      - Owner can see their own sets');
  console.log('      - Anyone can see sets where is_shared = true');
  console.log('   2. Ensure users table has RLS that only allows:');
  console.log('      - User can see their own data');
  console.log('      - No anonymous access');
}

testUnauthorizedAccess().catch(console.error);
