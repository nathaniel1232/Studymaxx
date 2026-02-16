-- Grant Premium Access to Test User
-- Run this in Supabase SQL Editor

-- STEP 1: First check if user exists
SELECT 
  id,
  email,
  is_premium,
  premium_expires_at,
  stripe_customer_id,
  stripe_subscription_id
FROM public.users
WHERE email = 'alexroussossm@gmail.com';

-- STEP 2: If user exists, grant premium access (run this):
UPDATE public.users
SET 
  is_premium = true,
  premium_expires_at = (NOW() + INTERVAL '1 year')::timestamptz,
  stripe_customer_id = COALESCE(stripe_customer_id, 'manual_' || id::text),
  stripe_subscription_id = COALESCE(stripe_subscription_id, 'test_sub_' || id::text),
  updated_at = NOW()
WHERE email = 'alexroussossm@gmail.com'
RETURNING id, email, is_premium, premium_expires_at;

-- STEP 3: Verify it worked
SELECT 
  id,
  email,
  is_premium,
  premium_expires_at,
  stripe_customer_id,
  created_at
FROM public.users
WHERE email = 'alexroussossm@gmail.com';

-- ❗ If STEP 1 returns no rows:
-- The user hasn't signed up yet. Tell Alex to:
-- 1. Go to studymaxx.net
-- 2. Sign up with alexroussossm@gmail.com
-- 3. Then run this SQL again
