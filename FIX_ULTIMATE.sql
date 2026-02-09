-- ====================================================================
-- ULTIMATE FIX - Legger til ALLE manglende kolonner
-- ====================================================================

-- STEG 1: Legg til alle manglende kolonner
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_grandfathered BOOLEAN DEFAULT FALSE;

-- ====================================================================
-- STEG 2: Se nåværende status
-- ====================================================================
SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at,
  subscription_tier
FROM users
WHERE email = 'nathanielfisk54@gmail.com';

-- ====================================================================
-- STEG 3: AKTIVER PREMIUM MED STRIPE DATA
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
-- STEG 4: VERIFISER AT DET VIRKET
-- ====================================================================

SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at,
  subscription_tier,
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
-- premium_expires_at: [dato 1 måned fra nå]
-- subscription_tier: premium  ✅
-- is_active: true  ✅
-- ====================================================================

-- ====================================================================
-- HUSK: Etter dette, be brukeren:
-- 1. Logge ut HELT (Sign Out)
-- 2. Lukke alle browser tabs
-- 3. Logge inn igjen
-- 4. Premium skal nå virke! "Manage Subscription" button skal vises
-- ====================================================================
