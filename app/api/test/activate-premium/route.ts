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

  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update user to premium
    const { data, error } = await supabase
      .from('users')
      .update({ is_premium: true })
      .eq('email', email)
      .select();

    if (error) {
      console.error('Error updating premium status:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Premium activated for ${email}`,
        user: data[0]
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
