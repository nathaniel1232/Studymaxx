-- Upgrade studymaxxer@gmail.com to Pro tier (best premium)
-- Run this in Supabase SQL Editor

UPDATE users 
SET 
  subscription_tier = 'pro',
  is_premium = true,
  billing_interval = 'yearly'
WHERE email = 'studymaxxer@gmail.com';

-- Verify the update
SELECT 
  id, 
  email, 
  subscription_tier, 
  is_premium,
  billing_interval,
  created_at
FROM users 
WHERE email = 'studymaxxer@gmail.com';
