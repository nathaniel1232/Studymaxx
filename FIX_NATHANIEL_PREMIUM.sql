-- EMERGENCY FIX for nathanielfisk54@gmail.com premium activation
-- Run this in Supabase SQL Editor RIGHT NOW

-- Step 1: Check current status
SELECT 
  id::text as user_id,
  email,
  is_premium,
  is_grandfathered,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at::timestamptz as expires,
  subscription_tier,
  created_at::timestamptz as joined
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- Step 2: FORCE ACTIVATE PREMIUM (ensures 30 days of premium)
UPDATE users
SET 
  is_premium = true,
  premium_expires_at = (NOW() + INTERVAL '30 days'),
  subscription_tier = 'premium'
WHERE email = 'nathanielfisk54@gmail.com';

-- Step 3: Verify activation
SELECT 
  id::text as user_id,
  email,
  is_premium,
  premium_expires_at::timestamptz as expires,
  subscription_tier,
  (premium_expires_at > NOW()) as "is_active"
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- Step 4: Check ALL users with is_premium = true (to find other affected users)
SELECT 
  email,
  is_premium,
  stripe_customer_id,
  premium_expires_at::timestamptz as expires,
  (premium_expires_at > NOW() OR premium_expires_at IS NULL) as "is_active"
FROM users
WHERE is_premium = true
ORDER BY created_at DESC;
