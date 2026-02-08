-- ============================================
-- PRICING UPDATE MIGRATION
-- New Structure: Free ($0), Premium ($4.99), Pro ($14.99)
-- Grandfathers existing $2.99 users at their price with Premium features
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add grandfathering columns to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'grandfathered_price_cents'
  ) THEN
    ALTER TABLE users ADD COLUMN grandfathered_price_cents INTEGER DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_grandfathered'
  ) THEN
    ALTER TABLE users ADD COLUMN is_grandfathered BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 2: Grandfather ALL existing premium users at $2.99
-- They keep their price and get Premium tier features
UPDATE users 
SET 
  is_grandfathered = TRUE,
  grandfathered_price_cents = 299,
  subscription_tier = 'premium'
WHERE is_premium = TRUE 
  AND (is_grandfathered IS NULL OR is_grandfathered = FALSE);

-- Step 3: Update subscription_tiers table with new tier names
-- Change 'student' to 'premium' in the constraint
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscription_tiers_tier_name_check' 
    AND table_name = 'subscription_tiers'
  ) THEN
    ALTER TABLE subscription_tiers DROP CONSTRAINT subscription_tiers_tier_name_check;
  END IF;
  
  -- Add new constraint
  ALTER TABLE subscription_tiers 
    ADD CONSTRAINT subscription_tiers_tier_name_check 
    CHECK (tier_name IN ('free', 'premium', 'pro', 'team'));
END $$;

-- Step 4: Update tier data with new pricing
-- Delete old 'student' tier if it exists
DELETE FROM subscription_tiers WHERE tier_name = 'student';

-- Upsert new pricing structure
INSERT INTO subscription_tiers (tier_name, display_name, monthly_price_cents, yearly_price_cents, max_daily_sets, max_cards_per_set, max_folders, features) VALUES
('free', 'Free', 0, 0, 3, 10, 5, 
  '{"pdf": false, "youtube": false, "ocr_images": 0, "export": false, "analytics": false, "srs": false, "collaboration": false, "priority_support": false}'::jsonb),
  
('premium', 'Premium', 499, 4900, -1, 30, -1, 
  '{"pdf": true, "youtube": true, "ocr_images": -1, "export": true, "analytics": true, "srs": true, "collaboration": false, "priority_support": true}'::jsonb),
  
('pro', 'Pro', 1499, 14900, -1, 60, -1, 
  '{"pdf": true, "youtube": true, "ocr_images": -1, "export": true, "analytics": true, "srs": true, "collaboration": true, "priority_support": true}'::jsonb),
  
('team', 'Team', 2999, 29900, -1, 100, -1, 
  '{"pdf": true, "youtube": true, "ocr_images": -1, "export": true, "analytics": true, "srs": true, "collaboration": true, "priority_support": true, "team_seats": 5, "admin_dashboard": true}'::jsonb)
ON CONFLICT (tier_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  yearly_price_cents = EXCLUDED.yearly_price_cents,
  max_daily_sets = EXCLUDED.max_daily_sets,
  max_cards_per_set = EXCLUDED.max_cards_per_set,
  max_folders = EXCLUDED.max_folders,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Step 5: Verify the changes
DO $$
DECLARE
  grandfathered_count INTEGER;
  premium_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO grandfathered_count FROM users WHERE is_grandfathered = TRUE;
  SELECT COUNT(*) INTO premium_count FROM users WHERE is_premium = TRUE AND subscription_tier = 'premium';
  
  RAISE NOTICE '✅ Pricing migration complete!';
  RAISE NOTICE '📊 New Tiers: Free ($0), Premium ($4.99), Pro ($14.99), Team ($29.99)';
  RAISE NOTICE '🎁 Grandfathered users: %', grandfathered_count;
  RAISE NOTICE '👥 Premium users: %', premium_count;
  RAISE NOTICE '💡 Legacy $2.99 users keep their price with Premium features!';
  RAISE NOTICE '🎯 Next: Update Stripe products to match new pricing';
END $$;
