-- ====================================================================
-- EMERGENCY FIX: Manually link Stripe → Supabase for nathanielfisk54@gmail.com
-- ====================================================================
-- 
-- STEPS:
-- 1. Go to Stripe Dashboard → Customers
-- 2. Search for: nathanielfisk54@gmail.com
-- 3. Copy the Customer ID (cus_XXXXXXXXXXXXX)
-- 4. Click on the customer, see Subscriptions tab
-- 5. Copy the Subscription ID (sub_XXXXXXXXXXXXX)
-- 6. Replace the values below and run in Supabase SQL Editor
--
-- ====================================================================

-- STEP 1: Check current status
SELECT 
  id::text as user_id,
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at::timestamptz,
  subscription_tier
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- ====================================================================
-- STEP 2: UPDATE WITH STRIPE DATA
-- ====================================================================
-- ⚠️  REPLACE 'cus_XXXXX' and 'sub_XXXXX' below with REAL IDs from Stripe!
-- ====================================================================

UPDATE users
SET 
  is_premium = true,
  stripe_customer_id = 'cus_REPLACE_ME',  -- ← Get from Stripe Dashboard
  stripe_subscription_id = 'sub_REPLACE_ME',  -- ← Get from Stripe Dashboard
  premium_expires_at = NOW() + INTERVAL '30 days',
  subscription_tier = 'premium'
WHERE email = 'nathanielfisk54@gmail.com';

-- ====================================================================
-- STEP 3: Verify it worked
-- ====================================================================

SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at::timestamptz as expires,
  (premium_expires_at > NOW()) as "is_active"
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- ====================================================================
-- EXPECTED RESULT:
-- ====================================================================
-- email: nathanielfisk54@gmail.com
-- is_premium: true
-- stripe_customer_id: cus_XXXXXXXXX  (should have value now!)
-- stripe_subscription_id: sub_XXXXXXXXX  (should have value now!)
-- expires: [date 30 days from now]
-- is_active: true
-- ====================================================================

-- ====================================================================
-- STEP 4: Test "Manage Subscription" Button
-- ====================================================================
-- After running this SQL:
-- 1. Tell nathanielfisk54@gmail.com to LOGOUT completely
-- 2. Close all browser tabs
-- 3. LOGIN again
-- 4. Go to Dashboard
-- 5. Look in sidebar for "Manage Subscription" button (gold)
-- 6. Click it → should open Stripe billing portal
-- ====================================================================

-- ====================================================================
-- BONUS: See ALL users who need this fix
-- ====================================================================

SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  CASE 
    WHEN stripe_customer_id IS NULL THEN '❌ Missing Stripe ID - needs manual fix'
    WHEN premium_expires_at < NOW() THEN '⚠️ Expired'
    ELSE '✅ OK'
  END as status
FROM users
WHERE is_premium = true
ORDER BY created_at DESC;

-- ====================================================================
-- For each user with "❌ Missing Stripe ID", repeat STEP 2 above
-- (Search email in Stripe, get IDs, update SQL, run)
-- ====================================================================
