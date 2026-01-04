import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env.local');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: npx ts-node scripts/activate-premium.ts <email>');
  console.error('Example: npx ts-node scripts/activate-premium.ts william@example.com');
  process.exit(1);
}

async function activatePremium() {
  try {
    console.log(`⏳ Activating premium for ${email}...`);
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user first to verify exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_premium')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.is_premium) {
      console.log(`✓ User ${email} is already premium`);
      process.exit(0);
    }

    // Update user to premium
    const { data, error } = await supabase
      .from('users')
      .update({ is_premium: true })
      .eq('email', email)
      .select();

    if (error) {
      console.error('❌ Error updating premium status:', error.message);
      process.exit(1);
    }

    console.log(`✅ Premium activated for ${email}`);
    console.log(`User ID: ${user.id}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Exception:', error.message);
    process.exit(1);
  }
}

activatePremium();
