-- ====================================================================
-- KLAR TIL BRUK - Bare kopier ALT og lim inn i Supabase SQL Editor
-- ====================================================================
-- For: nathanielfisk54@gmail.com
-- Stripe Customer ID: cus_TwXPEthmGXGUJR
-- Stripe Subscription ID: sub_1SyeMBPDFQXMY7ip4U4wl9pJ
-- ====================================================================

-- STEG 1: Se nåværende status (KJØR DETTE FØRST)
SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- ====================================================================
-- STEG 2: AKTIVER PREMIUM MED STRIPE DATA (KJØR DETTE)
-- ====================================================================

UPDATE users
SET 
  is_premium = true,
  stripe_customer_id = 'cus_TwXPEthmGXGUJR',
  stripe_subscription_id = 'sub_1SyeMBPDFQXMY7ip4U4wl9pJ',
  premium_expires_at = NOW() + INTERVAL '1 month',
  subscription_tier = 'premium'
WHERE email = 'nathanielfisk54@gmail.com';

-- ====================================================================
-- STEG 3: VERIFISER AT DET VIRKET (KJØR DETTE)
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
-- FORVENTET RESULTAT:
-- ====================================================================
-- email: nathanielfisk54@gmail.com
-- is_premium: true
-- stripe_customer_id: cus_TwXPEthmGXGUJR  ✅
-- stripe_subscription_id: sub_1SyeMBPDFQXMY7ip4U4wl9pJ  ✅
-- expires: [dato 1 måned fra nå]
-- is_active: true  ✅
-- ====================================================================

-- ====================================================================
-- HUSK: Etter dette, be brukeren:
-- 1. Logge ut HELT (Sign Out)
-- 2. Lukke alle browser tabs
-- 3. Logge inn igjen
-- 4. Premium skal nå virke! "Manage Subscription" button skal vises
-- ====================================================================
