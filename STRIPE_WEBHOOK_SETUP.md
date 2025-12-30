# Stripe Premium Setup Guide

## Current Status

Your Stripe integration is **code-ready** but needs webhook configuration to work properly.

## Why Premium Isn't Working Yet

The payment flow works like this:
1. User clicks "Upgrade to Premium" ✅ (Working)
2. User pays on Stripe ✅ (Working) 
3. **Stripe webhook tells our database to set `is_premium = true`** ❌ (Not configured)
4. User gets Premium features ⏳ (Waiting on step 3)

## Step-by-Step Setup

### 1. Test Mode Setup (Current - Sandbox)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter webhook URL:
   ```
   https://your-production-domain.com/api/stripe/webhook
   ```
   For local testing:
   ```
   http://localhost:3000/api/stripe/webhook
   ```

4. Select events to listen for:
   - `checkout.session.completed` ✅
   - `customer.subscription.deleted` ✅
   - `customer.subscription.updated` ✅
   - `invoice.payment_failed` ✅

5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### 2. Local Testing with Stripe CLI

For local development, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will give you a webhook signing secret (whsec_...)
# Copy it to .env.local
```

### 3. Test the Flow

1. Restart your dev server after adding `STRIPE_WEBHOOK_SECRET`
2. Click "Upgrade to Premium"
3. Use test card: `4242 4242 4242 4242`, any future date, any CVC
4. Check terminal logs for:
   ```
   ✅ Checkout completed for user: [userId]
   ✅ User [userId] is now Premium
   ```
5. Refresh page - user should see Premium badge

### 4. Production Setup

When deploying:

1. Go to [Live Mode Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint with your production URL
3. Copy **live mode** signing secret
4. Add to production environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx (LIVE)
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx (LIVE)
   STRIPE_PRICE_ID_MONTHLY=price_xxxxxxxxxxxxx (LIVE)
   ```

## Current Environment Variables Needed

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Price IDs (from Stripe Products)
STRIPE_PRICE_ID_MONTHLY=price_xxxxx  # 49 NOK/month
STRIPE_PRICE_ID_YEARLY=price_xxxxx   # 499 NOK/year

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

## Verifying It Works

1. **Check Stripe Dashboard**: 
   - Go to Webhooks tab
   - Should see successful events (green checkmarks)

2. **Check Database**:
   ```sql
   SELECT id, email, is_premium FROM users WHERE email = 'your-test-email@example.com';
   ```
   Should show `is_premium: true`

3. **Check App**:
   - User dropdown shows "⭐ Premium"
   - Settings page shows "Premium" status
   - Can generate unlimited flashcards

## Troubleshooting

### Premium not updating after payment

1. Check webhook is configured in Stripe Dashboard
2. Check `STRIPE_WEBHOOK_SECRET` is in `.env.local`
3. Check webhook logs in Stripe Dashboard for errors
4. Check your server logs for webhook errors

### "Invalid signature" error

- Wrong `STRIPE_WEBHOOK_SECRET` 
- Using test mode secret in production (or vice versa)

### User loses Premium on different device

This shouldn't happen! Premium is tied to `user.id` in the database.
- Make sure user is **logged in** with same email on both devices
- Check database: `is_premium` should be `true` for that user

## Next Steps

1. ✅ Add webhook endpoint to Stripe Dashboard
2. ✅ Add `STRIPE_WEBHOOK_SECRET` to environment variables
3. ✅ Test with test card
4. ✅ Verify Premium status persists across page refreshes
5. ✅ Deploy to production with live mode keys
