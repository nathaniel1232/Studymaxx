-- URGENT: Manually activate premium for user who paid but webhook failed
-- Run this in Supabase SQL Editor

-- STEP 1: Find the user by email (replace with actual email)
-- Replace 'USER_EMAIL_HERE' with the actual email address
SELECT 
  id::text as user_id,
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  created_at::timestamptz as joined_at
FROM users
WHERE email = 'USER_EMAIL_HERE';  -- <-- REPLACE THIS

-- STEP 2: Activate premium for this user
-- Replace 'USER_ID_HERE' with the id from step 1
UPDATE users
SET 
  is_premium = true,
  premium_expires_at = (NOW() + INTERVAL '1 month'),  -- Adjust if they paid yearly
  subscription_tier = 'premium'
WHERE id = 'USER_ID_HERE';  -- <-- REPLACE THIS

-- STEP 3: Verify the update
SELECT 
  id::text as user_id,
  email,
  is_premium,
  premium_expires_at::timestamptz as expires_at,
  subscription_tier,
  stripe_customer_id,
  stripe_subscription_id
FROM users
WHERE id = 'USER_ID_HERE';  -- <-- REPLACE THIS
