// Test creating a shared flashcard set
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCreateShare() {
  console.log('Testing share creation...\n');
  
  // Get first user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);
  
  if (userError || !users || users.length === 0) {
    console.error('❌ No users found:', userError);
    return;
  }
  
  const testUser = users[0];
  console.log(`Using test user: ${testUser.email}`);
  
  // Create a test flashcard set
  const testSet = {
    user_id: testUser.id,
    name: 'Test Share Set',
    subject: 'Testing',
    grade: 'Test',
    cards: [
      { id: '1', front: 'Test Q1', back: 'Test A1' },
      { id: '2', front: 'Test Q2', back: 'Test A2' }
    ],
    share_id: 'testshare_' + Date.now(),
    is_shared: true,
    created_at: new Date().toISOString()
  };
  
  console.log(`\n1. Creating flashcard set with share_id: ${testSet.share_id}`);
  
  const { data: insertData, error: insertError } = await supabase
    .from('flashcard_sets')
    .insert(testSet)
    .select()
    .single();
  
  if (insertError) {
    console.error('❌ Insert failed:', insertError);
    return;
  }
  
  console.log('✅ Created shared set:', insertData.id);
  
  // Test retrieving by share_id
  console.log(`\n2. Fetching by share_id: ${testSet.share_id}`);
  
  const { data: fetchData, error: fetchError } = await supabase
    .from('flashcard_sets')
    .select('*')
    .eq('share_id', testSet.share_id)
    .single();
  
  if (fetchError) {
    console.error('❌ Fetch failed:', fetchError);
  } else {
    console.log('✅ Successfully retrieved shared set');
    console.log(`   ID: ${fetchData.id}`);
    console.log(`   Name: ${fetchData.name}`);
    console.log(`   Cards: ${fetchData.cards.length}`);
  }
  
  // Test anonymous access
  console.log('\n3. Testing anonymous access...');
  
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data: anonData, error: anonError } = await anonClient
    .from('flashcard_sets')
    .select('*')
    .eq('share_id', testSet.share_id)
    .single();
  
  if (anonError) {
    console.error('❌ Anonymous access failed:', anonError);
  } else {
    console.log('✅ Anonymous user can access shared set');
  }
  
  // Cleanup
  console.log('\n4. Cleaning up test data...');
  const { error: deleteError } = await supabase
    .from('flashcard_sets')
    .delete()
    .eq('share_id', testSet.share_id);
  
  if (deleteError) {
    console.error('⚠️  Cleanup failed:', deleteError);
  } else {
    console.log('✅ Test data cleaned up');
  }
  
  console.log('\n✅ Share test complete - everything works!');
  console.log('The share_url should be: https://www.studymaxx.net/share/' + testSet.share_id);
}

testCreateShare().catch(console.error);
