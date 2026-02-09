-- EMERGENCY: Activate premium for nathanielfisk54@gmail.com right now
-- Run this in Supabase SQL Editor

-- First, check current status
SELECT 
  id::text as user_id,
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at::timestamptz as expires,
  created_at::timestamptz as joined
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- Activate premium with proper expiration (30 days from now)
UPDATE users
SET 
  is_premium = true,
  premium_expires_at = (NOW() + INTERVAL '30 days'),
  subscription_tier = 'premium'
WHERE email = 'nathanielfisk54@gmail.com';

-- Verify it worked
SELECT 
  id::text as user_id,
  email,
  is_premium,
  premium_expires_at::timestamptz as expires,
  subscription_tier
FROM users
WHERE email = 'nathanielfisk54@gmail.com';
