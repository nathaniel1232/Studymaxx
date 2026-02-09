-- ====================================================================
-- RETT EKSPIRASJONDATOER - Basert på Stripe subscription period_end
-- ====================================================================

-- For å RIKTIG sette ekspirasjondatoer, trenger vi:
-- 1. Stripe subscription data for hver bruker
-- 2. Eller få bruker til å fortelle når abonnementet deres avsluttes

-- MEN FØRST - la oss sjekke hva som finnes av Stripe data:

SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at,
  CASE 
    WHEN stripe_subscription_id IS NOT NULL THEN '✅ Has Stripe ID - can get correct date'
    WHEN premium_expires_at IS NOT NULL THEN '⚠️  Has expiry date'
    ELSE '❌ No Stripe ID and no expiry - needs manual fix'
  END as status
FROM users
WHERE is_premium = true
ORDER BY email;

-- ====================================================================
-- MANUAL FIX: Sett riktige ekspirasjondatoer
-- ====================================================================

-- HVIS alle har samme sluttdato (9. mars 2026):
-- UPDATE users
-- SET premium_expires_at = '2026-03-09'::timestamptz
-- WHERE is_premium = true;

-- ELLER hvis du vet når hver bruker betalte:
-- UPDATE users
-- SET premium_expires_at = '2026-03-09'::timestamptz
-- WHERE email = 'bruker@example.com';

-- ====================================================================
-- Hvis du vil LEGGE INN riktige datoer for hver bruker:
-- Gi meg en liste på format:
--   email@example.com -> 2026-03-09
--   annen@example.com -> 2026-04-15
-- Så lager jeg en SQL som oppdaterer alle!
-- ====================================================================

-- Verifiser at alle har riktige datoer etterpå:
SELECT 
  email,
  is_premium,
  premium_expires_at,
  (premium_expires_at > NOW()) as "is_valid",
  CASE 
    WHEN premium_expires_at > NOW() THEN '✅ Still Active'
    WHEN premium_expires_at IS NULL THEN '⚠️ Date Missing'
    ELSE '❌ Expired'
  END as status
FROM users
WHERE is_premium = true
ORDER BY premium_expires_at DESC;
