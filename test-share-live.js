// Test share functionality directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testShare() {
  console.log('Testing share functionality...\n');
  
  // Check if flashcard_sets table has is_shared and share_id columns
  console.log('1. Checking flashcard_sets schema...');
  const { data: tables, error: schemaError } = await supabase
    .from('flashcard_sets')
    .select('*')
    .limit(1);
  
  if (schemaError) {
    console.error('❌ Schema check failed:', schemaError);
    return;
  }
  
  console.log('✅ Schema accessible');
  
  if (tables && tables[0]) {
    console.log('Available columns:', Object.keys(tables[0]));
    const hasShareId = 'share_id' in tables[0];
    const hasIsShared = 'is_shared' in tables[0];
    console.log(`   - share_id column exists: ${hasShareId}`);
    console.log(`   - is_shared column exists: ${hasIsShared}`);
    
    if (!hasShareId || !hasIsShared) {
      console.log('\n⚠️  Missing sharing columns! Need to add:');
      if (!hasShareId) console.log('   ALTER TABLE flashcard_sets ADD COLUMN share_id TEXT;');
      if (!hasIsShared) console.log('   ALTER TABLE flashcard_sets ADD COLUMN is_shared BOOLEAN DEFAULT false;');
    }
  }
  
  // Check RLS policies on flashcard_sets
  console.log('\n2. Testing RLS policies...');
  const { data: publicSets, error: rlsError } = await supabase
    .from('flashcard_sets')
    .select('*')
    .eq('is_shared', true)
    .limit(5);
  
  if (rlsError) {
    console.error('❌ RLS query failed:', rlsError);
  } else {
    console.log('✅ Can query shared sets');
    console.log(`   Found ${publicSets?.length || 0} shared sets`);
  }
  
  // Test anonymous access to shared set
  console.log('\n3. Testing anonymous access to shared sets...');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  const { data: anonData, error: anonError } = await anonClient
    .from('flashcard_sets')
    .select('*')
    .eq('is_shared', true)
    .limit(1);
  
  if (anonError) {
    console.error('❌ Anonymous access failed:', anonError);
    console.log('⚠️  Need to add RLS policy:');
    console.log(`
CREATE POLICY "Allow public read access to shared flashcard sets"
ON flashcard_sets FOR SELECT
USING (is_shared = true);
    `);
  } else {
    console.log('✅ Anonymous users can read shared sets');
  }
  
  console.log('\n✅ Share diagnostic complete');
}

testShare().catch(console.error);
