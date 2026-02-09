-- EMERGENCY: Check all premium users and verify
-- Run this in Supabase SQL Editor to see WHO has premium

-- List ALL users with premium = true
SELECT 
  id::text as user_id,
  email,
  is_premium,
  is_grandfathered,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at::timestamptz as expires_at,
  created_at::timestamptz as joined_at
FROM users
WHERE is_premium = true
ORDER BY created_at DESC;

-- Count total premium users
SELECT COUNT(*) as total_premium_users
FROM users
WHERE is_premium = true;

-- Find users who paid but might not have premium yet
SELECT 
  id::text as user_id,
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  created_at::timestamptz as joined_at
FROM users
WHERE stripe_subscription_id IS NOT NULL
  OR stripe_customer_id IS NOT NULL
ORDER BY created_at DESC;
