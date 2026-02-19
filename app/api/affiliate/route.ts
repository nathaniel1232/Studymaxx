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
    console.log('[Affiliate] Received submission:', { fullName: body.fullName, email: body.email, tiktokHandle: body.tiktokHandle });

    // Validate required fields
    if (!body.fullName || !body.email || !body.tiktokHandle) {
      console.error('[Affiliate] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store in Supabase with service role key (no auth required)
    const { data, error } = await supabase
      .from('affiliate_applications')
      .insert({
        full_name: body.fullName,
        email: body.email,
        tiktok_handle: body.tiktokHandle,
        message: body.message || null,
        status: 'pending'
      })
      .select();

    if (error) {
      console.error('[Affiliate] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Affiliate] Successfully inserted:', data);

    // Send email to admin (optional - won't fail if this errors)
    try {
      if (process.env.RESEND_API_KEY) {
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
        console.log('[Affiliate] Email notification sent successfully');
      } else {
        console.warn('[Affiliate] RESEND_API_KEY not configured - skipping email');
      }
    } catch (emailError) {
      console.warn('[Affiliate] Email notification failed:', emailError);
      // Don't fail the request if email notification fails
    }

    return NextResponse.json(
      { success: true, message: 'Application received', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Affiliate] Request error:', error);
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
}
