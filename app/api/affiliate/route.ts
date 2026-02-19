import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AffiliateSubmission {
  fullName: string;
  email: string;
  tiktokHandle: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AffiliateSubmission = await request.json();

    // Validate required fields
    if (!body.fullName || !body.email || !body.tiktokHandle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store in Supabase
    const { error } = await supabase
      .from('affiliate_applications')
      .insert({
        full_name: body.fullName,
        email: body.email,
        tiktok_handle: body.tiktokHandle,
        message: body.message || null,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Affiliate] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    // Send email to admin
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'StudyMaxx <noreply@studymaxx.net>',
          to: 'studymaxxer@gmail.com',
          subject: `New Affiliate Application from ${body.fullName}`,
          html: `
            <h2>New Affiliate Application</h2>
            <p><strong>Name:</strong> ${body.fullName}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>TikTok/Social:</strong> ${body.tiktokHandle}</p>
            <p><strong>Message:</strong></p>
            <p>${body.message || 'No message provided'}</p>
            <p>Submitted at: ${new Date().toISOString()}</p>
          `
        })
      });
    } catch (emailError) {
      console.warn('[Affiliate] Email notification failed:', emailError);
      // Don't fail the request if email notification fails
    }

    return NextResponse.json(
      { success: true, message: 'Application received' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Affiliate] Request error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
