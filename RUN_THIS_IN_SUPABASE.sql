-- ============================================
-- COMPLETE MULTI-TIER SETUP + STUDYMAXXER UPGRADE
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- Then click "Run" to execute everything
-- ============================================

-- Step 1: Create subscription tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  tier_name TEXT PRIMARY KEY CHECK (tier_name IN ('free', 'student', 'pro', 'team')),
  display_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  yearly_price_cents INTEGER NOT NULL,
  stripe_monthly_price_id TEXT,
  stripe_yearly_price_id TEXT,
  
  -- Limits
  max_daily_sets INTEGER NOT NULL, -- -1 = unlimited
  max_cards_per_set INTEGER NOT NULL,
  max_folders INTEGER NOT NULL, -- -1 = unlimited
  
  -- Features (as JSONB for flexibility)
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default tiers
INSERT INTO subscription_tiers (tier_name, display_name, monthly_price_cents, yearly_price_cents, max_daily_sets, max_cards_per_set, max_folders, features) VALUES
('free', 'Free', 0, 0, 3, 10, 5, 
  '{"pdf": false, "youtube": false, "ocr_images": 0, "export": false, "analytics": false, "srs": false, "collaboration": false, "priority_support": false}'::jsonb),
  
('student', 'Student', 499, 4900, 20, 25, 10, 
  '{"pdf": true, "youtube": false, "ocr_images": 3, "export": true, "analytics": true, "srs": false, "collaboration": false, "priority_support": false}'::jsonb),
  
('pro', 'Pro', 999, 9900, -1, 50, -1, 
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

-- Step 3: Add subscription tier to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free' 
      REFERENCES subscription_tiers(tier_name);
  END IF;
END $$;

-- Step 4: Add billing interval tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'billing_interval'
  ) THEN
    ALTER TABLE users ADD COLUMN billing_interval TEXT DEFAULT 'monthly' 
      CHECK (billing_interval IN ('monthly', 'yearly'));
  END IF;
END $$;

-- Step 5: Add usage tracking columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'daily_sets_created'
  ) THEN
    ALTER TABLE users ADD COLUMN daily_sets_created INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_set_created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_set_created_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 6: UPGRADE studymaxxer@gmail.com to Pro tier
UPDATE users 
SET 
  subscription_tier = 'pro',
  is_premium = true,
  billing_interval = 'yearly'
WHERE email = 'studymaxxer@gmail.com';

-- Step 7: Verify the setup
SELECT '✅ SETUP COMPLETE! Here is your account:' AS status;

SELECT 
  id, 
  email, 
  subscription_tier, 
  is_premium,
  billing_interval,
  created_at
FROM users 
WHERE email = 'studymaxxer@gmail.com';

SELECT '✅ Available tiers:' AS status;

SELECT 
  tier_name,
  display_name,
  monthly_price_cents / 100.0 AS monthly_price_usd,
  yearly_price_cents / 100.0 AS yearly_price_usd,
  max_daily_sets,
  max_cards_per_set
FROM subscription_tiers
ORDER BY monthly_price_cents;
