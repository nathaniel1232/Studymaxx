/**
 * Manual Premium Activation Endpoint
 * USE THIS IN TEST MODE to activate Premium after Stripe checkout
 * In production, the webhook handles this automatically
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials not configured");
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Verify token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication'
      }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;

    console.log(`[Premium Activate] User: ${userId} (${userEmail})`);

    // Find the user's Stripe customer by searching with the email
    let stripeCustomerId: string | null = null;
    let hasActiveSubscription = false;
    
    try {
      // List all customers to find ones matching this email
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 100
      });
      
      console.log(`[Premium Activate] Found ${customers.data.length} customers for email: ${userEmail}`);
      
      // Check each customer for active subscriptions
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          console.log(`[Premium Activate] Found subscription for customer ${customer.id}: status=${sub.status}`);
          
          if (sub.status === 'active' || sub.status === 'trialing') {
            stripeCustomerId = customer.id;
            hasActiveSubscription = true;
            console.log(`[Premium Activate] ✅ Active subscription found: ${sub.id}`);
            break;
          }
        }
      }
    } catch (err: any) {
      console.error('[Premium Activate] Failed to fetch Stripe customer:', err);
      return NextResponse.json({
        error: 'Failed to verify payment status',
        details: err.message
      }, { status: 500 });
    }

    // Only activate if they have a Stripe subscription
    if (!hasActiveSubscription) {
      console.log(`[Premium Activate] ❌ No active subscription found for ${userEmail}`);
      return NextResponse.json({
        error: 'No active subscription found. Please complete payment first.',
        premium: false
      }, { status: 402 });
    }

    // Check if user exists in users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, is_premium")
      .eq("id", userId)
      .single();

    if (existingUser) {
      // Update existing user to Premium
      const updateData: any = { is_premium: true };
      if (stripeCustomerId) {
        updateData.stripe_customer_id = stripeCustomerId;
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

      if (error) {
        console.error("Failed to activate Premium:", error);
        return NextResponse.json({ error: 'Failed to activate Premium' }, { status: 500 });
      }

      console.log(`✅ User ${userId} (${user.email}) activated as Premium with customer ID: ${stripeCustomerId}`);
    } else {
      // Create new user as Premium
      const insertData: any = {
        id: userId,
        email: user.email,
        is_premium: true
      };
      if (stripeCustomerId) {
        insertData.stripe_customer_id = stripeCustomerId;
      }

      const { error } = await supabase
        .from("users")
        .insert(insertData);

      if (error) {
        console.error("Failed to create Premium user:", error);
        return NextResponse.json({ error: 'Failed to create Premium user' }, { status: 500 });
      }

      console.log(`✅ User ${userId} (${user.email}) created as Premium`);
    }

    return NextResponse.json({
      success: true,
      message: 'Premium activated! Please refresh the page.',
      isPremium: true
    });

  } catch (error: any) {
    console.error('Premium activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
