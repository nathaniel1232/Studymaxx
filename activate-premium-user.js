const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function activatePremiumForUser(email) {
  try {
    console.log(`Activating premium for ${email}...`);

    // Find the user
    const { data: userData, error: findError } = await supabase
      .from('users')
      .select('id, email, is_premium')
      .eq('email', email)
      .single();

    if (findError || !userData) {
      console.error(`Error finding user ${email}:`, findError);
      process.exit(1);
    }

    console.log(`Found user: ${userData.email}, current premium: ${userData.is_premium}`);

    // Update premium status
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ 
        is_premium: true
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error updating premium status:', updateError);
      process.exit(1);
    }

    console.log(`✅ Premium activated for ${email}`);

    // Verify update
    const { data: verified } = await supabase
      .from('users')
      .select('email, is_premium')
      .eq('id', userData.id)
      .single();

    console.log(`✓ Verified: ${verified.email} is now premium: ${verified.is_premium}`);

    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

const targetEmail = process.argv[2] || 'benelias.ss@gmail.com';
activatePremiumForUser(targetEmail);
