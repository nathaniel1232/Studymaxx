-- ============================================
-- MULTI-TIER SUBSCRIPTION SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create subscription tiers table
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

-- 2. Insert default tiers
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

-- 3. Add subscription tier to users table
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

-- 4. Add billing interval tracking
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

-- 5. Add usage tracking columns
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
    WHERE table_name = 'users' AND column_name = 'last_set_reset'
  ) THEN
    ALTER TABLE users ADD COLUMN last_set_reset TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 6. Create study sessions table for analytics
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  flashcard_set_id TEXT,
  cards_studied INTEGER NOT NULL DEFAULT 0,
  cards_mastered INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  session_type TEXT CHECK (session_type IN ('study', 'test')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);

-- 8. Enable RLS on study_sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON study_sessions;
CREATE POLICY "Users can view own sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON study_sessions;
CREATE POLICY "Users can insert own sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- 9. Update existing premium users to 'pro' tier
UPDATE users 
SET subscription_tier = 'pro' 
WHERE is_premium = TRUE AND (subscription_tier = 'free' OR subscription_tier IS NULL);

-- 10. Create function to check tier features
CREATE OR REPLACE FUNCTION get_user_tier_features(user_tier TEXT)
RETURNS JSONB AS $$
DECLARE
  tier_features JSONB;
BEGIN
  SELECT features INTO tier_features
  FROM subscription_tiers
  WHERE tier_name = user_tier;
  
  RETURN tier_features;
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Create function to check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
  user_tier TEXT,
  action_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  tier_features JSONB;
  action_allowed BOOLEAN;
BEGIN
  SELECT features INTO tier_features
  FROM subscription_tiers
  WHERE tier_name = user_tier;
  
  -- Check if feature exists and is enabled
  action_allowed := (tier_features->action_type)::boolean;
  
  RETURN COALESCE(action_allowed, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Multi-tier subscription system created successfully!';
  RAISE NOTICE '📊 Tiers: Free (0), Student ($4.99), Pro ($9.99), Team ($29.99)';
  RAISE NOTICE '🎯 Next: Update Stripe with new price IDs';
END $$;
