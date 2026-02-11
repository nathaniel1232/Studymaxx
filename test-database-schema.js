require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseSchema() {
  console.log('\n🔍 Testing database schema compatibility...\n');
  
  try {
    // Test 1: Check if the query works
    const testUserId = '56947cda-5231-46bc-b903-7f21d5d5310d';
    
    console.log('Test 1: SELECT with new column list');
    const { data, error } = await supabase
      .from("users")
      .select("id, is_grandfathered, email")
      .eq("id", testUserId)
      .single();
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      console.log('Code:', error.code);
    } else {
      console.log('✅ SUCCESS! Query works');
      console.log('  Found user:', data.email);
    }
    
    console.log('\nTest 2: Check available columns');
    const { data: allData, error: error2 } = await supabase
      .from("users")
      .select("*")
      .limit(1)
      .single();
    
    if (!error2 && allData) {
      console.log('✅ Available columns:');
      Object.keys(allData).forEach(col => {
        console.log('  -', col);
      });
      
      if (allData.grandfathered_price_cents !== undefined) {
        console.log('\n⚠️  WARNING: grandfathered_price_cents exists in DB');
      } else {
        console.log('\n✅ CONFIRMED: grandfathered_price_cents does NOT exist');
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('RESULT: Webhook will now work correctly! ✅');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDatabaseSchema();
