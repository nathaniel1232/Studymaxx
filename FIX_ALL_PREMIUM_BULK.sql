-- ====================================================================
-- BULK FIX - Aktiverer ALLE premium brukere
-- ====================================================================

-- STEG 1: Legg til alle manglende kolonner
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_grandfathered BOOLEAN DEFAULT FALSE;

-- ====================================================================
-- STEG 2: Se ALLE premium brukere som trenger oppdatering
-- ====================================================================
SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at,
  subscription_tier,
  CASE 
    WHEN subscription_tier != 'premium' THEN '❌ NEEDS FIX'
    WHEN premium_expires_at IS NULL THEN '❌ NEEDS FIX'
    ELSE '✅ OK'
  END as status
FROM users
WHERE is_premium = true
ORDER BY created_at DESC;

-- ====================================================================
-- STEG 3: AKTIVER PREMIUM FOR ALLE (bulk update)
-- ====================================================================

UPDATE users
SET 
  premium_expires_at = COALESCE(premium_expires_at, NOW() + INTERVAL '1 month'),
  subscription_tier = 'premium'
WHERE is_premium = true 
  AND (premium_expires_at IS NULL OR subscription_tier != 'premium');

-- ====================================================================
-- STEG 4: VERIFISER AT ALLE ER OPPDATERT
-- ====================================================================

SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at,
  subscription_tier,
  (premium_expires_at > NOW()) as "is_active",
  CASE 
    WHEN is_premium = true AND subscription_tier = 'premium' THEN '✅ FIXED'
    ELSE '❌ STILL BROKEN'
  END as result
FROM users
WHERE is_premium = true
ORDER BY email;

-- ====================================================================
-- STEG 5: Teller hvor mange som ble fikset
-- ====================================================================

SELECT 
  COUNT(*) as "Total Premium Users",
  SUM(CASE WHEN subscription_tier = 'premium' THEN 1 ELSE 0 END) as "Fixed",
  SUM(CASE WHEN subscription_tier != 'premium' THEN 1 ELSE 0 END) as "Still Broken"
FROM users
WHERE is_premium = true;

-- ====================================================================
-- RESULTAT FORVENTET:
-- ====================================================================
-- Tabell 2: Se før-status for alle premium brukere
-- Tabell 3: "UPDATE X" (antall oppdatert)
-- Tabell 4: Se etter-status - alle skal ha subscription_tier = 'premium'
-- Tabell 5: Summary - "Fixed" skal vise totalt antall
-- ====================================================================

-- ====================================================================
-- HUSK: Etter dette, be ALLE premium brukere:
-- 1. Logge ut HELT
-- 2. Lukke alle browser tabs
-- 3. Logge inn igjen
-- 4. Premium skal nå virke for alle!
-- ====================================================================
