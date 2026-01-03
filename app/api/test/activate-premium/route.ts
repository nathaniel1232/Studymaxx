import { createClient } from '@supabase/supabase-js';

// ⚠️ WARNING: This endpoint is DEPRECATED
// Use `node scripts/activate-premium.js <email>` instead
// Keep this for emergency only, disabled by default

export async function POST(request: Request) {
  // Test endpoints disabled - use CLI script instead
  return new Response(
    JSON.stringify({ 
      error: 'This endpoint is disabled for security',
      message: 'Use: node scripts/activate-premium.js <email> instead'
    }),
    { status: 403 }
  );
}
