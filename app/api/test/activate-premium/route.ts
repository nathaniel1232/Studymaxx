import { createClient } from '@supabase/supabase-js';

// ⚠️ WARNING: This is a TEST endpoint only - Remove before production!
// Set ENABLE_TEST_ENDPOINTS=true in .env.local to use

export async function POST(request: Request) {
  // Check if test endpoints are enabled
  if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return new Response(
      JSON.stringify({ error: 'Test endpoints are disabled' }),
      { status: 403 }
    );
  }

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
