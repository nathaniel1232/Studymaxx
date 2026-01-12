/**
 * ADMIN DEBUG - Check all premium users and their status
 * GET /api/admin/premium-users
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role key to read all data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users with is_premium = true
    const { data: premiumUsers, error: premiumError } = await supabase
      .from('users')
      .select('id, email, is_premium, created_at')
      .eq('is_premium', true)
      .order('created_at', { ascending: false });

    if (premiumError) {
      return NextResponse.json({
        error: 'Failed to fetch premium users',
        details: premiumError.message
      }, { status: 500 });
    }

    // Get total count of all users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    // Get count of premium users
    const { count: premiumCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_premium', true);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers,
        premiumUsers: premiumCount,
        freeUsers: (totalUsers || 0) - (premiumCount || 0),
        premiumPercentage: totalUsers ? Math.round(((premiumCount || 0) / totalUsers) * 100) : 0
      },
      premiumUsersList: premiumUsers || [],
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
}
