const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function setupProblemReportsTable() {
  console.log('📝 Setting up problem_reports table...\n');

  const sql = fs.readFileSync('supabase_problem_reports_schema.sql', 'utf8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error:', error);
      
      // If exec_sql doesn't exist, try direct table creation
      console.log('\n⚠️ Trying alternative method...\n');
      
      const { data: tableData, error: tableError } = await supabase
        .from('problem_reports')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        console.log('Table does not exist. Please run this SQL in Supabase SQL Editor:');
        console.log('\n' + sql + '\n');
      } else if (!tableError) {
        console.log('✅ Table already exists!');
      }
    } else {
      console.log('✅ Successfully set up problem_reports table!');
    }
  } catch (err) {
    console.error('❌ Exception:', err);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + sql + '\n');
  }
}

setupProblemReportsTable();
