-- FIX: Activate premium for all early bird (grandfathered) users
-- Run this in Supabase SQL Editor

-- First, show all early bird users and their current premium status
SELECT 
  id::text as user_id,
  email,
  is_premium,
  is_grandfathered,
  created_at::date as joined_date
FROM users
WHERE is_grandfathered = true
ORDER BY created_at;

-- Activate premium for all early bird users (those with is_grandfathered = true)
UPDATE users
SET is_premium = true
WHERE is_grandfathered = true
  AND is_premium = false;

-- Verify: Show all early bird users again
SELECT 
  id::text as user_id,
  email,
  is_premium,
  is_grandfathered,
  created_at::date as joined_date
FROM users
WHERE is_grandfathered = true
ORDER BY created_at;
