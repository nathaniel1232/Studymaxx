// Quick script to check if folder_id column exists in flashcard_sets table
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');
  
  // Check if flashcard_sets table exists and what columns it has
  const { data: columns, error } = await supabase
    .from('flashcard_sets')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error querying flashcard_sets:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    if (error.message && error.message.includes('folder_id')) {
      console.log('\n💡 SOLUTION: The folder_id column is missing!');
      console.log('Run this SQL in Supabase SQL Editor:');
      console.log('\nALTER TABLE flashcard_sets ADD COLUMN folder_id UUID;');
      console.log('ALTER TABLE flashcard_sets ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;');
      console.log('CREATE INDEX idx_flashcard_sets_folder_id ON flashcard_sets(folder_id);');
    }
    return;
  }
  
  if (columns && columns.length > 0) {
    console.log('✅ flashcard_sets table accessible');
    console.log('Sample row columns:', Object.keys(columns[0]));
    
    if ('folder_id' in columns[0]) {
      console.log('✅ folder_id column exists');
    } else {
      console.log('❌ folder_id column MISSING');
      console.log('\n💡 SOLUTION: Run the folders schema SQL:');
      console.log('File: supabase_folders_schema.sql');
    }
  } else {
    console.log('⚠️  No rows in flashcard_sets table (empty table)');
    console.log('Cannot verify column existence without data.');
    console.log('\n💡 Try creating a test flashcard set first.');
  }
  
  // Check folders table
  const { data: folders, error: folderError } = await supabase
    .from('folders')
    .select('*')
    .limit(1);
  
  if (folderError) {
    console.log('\n❌ folders table does not exist');
    console.log('💡 SOLUTION: Run supabase_folders_schema.sql in Supabase SQL Editor');
  } else {
    console.log('\n✅ folders table exists');
    if (folders && folders.length > 0) {
      console.log('Sample folder:', folders[0]);
    }
  }
}

checkSchema().then(() => process.exit(0)).catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
