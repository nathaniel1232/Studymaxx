-- ===========================================
-- Personalization Schema for StudyMaxx
-- ===========================================
-- Paste this into Supabase SQL Editor and click Run.
-- Safe to run multiple times (uses IF NOT EXISTS).

DO $$ 
BEGIN
  -- Onboarding completed flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;

  -- Subjects (JSON text array, e.g. '["math","biology"]')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subjects') THEN
    ALTER TABLE public.users ADD COLUMN subjects TEXT;
  END IF;

  -- Legacy single subject field (kept for backwards compat)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subject') THEN
    ALTER TABLE public.users ADD COLUMN subject TEXT;
  END IF;

  -- Education level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'level') THEN
    ALTER TABLE public.users ADD COLUMN level TEXT CHECK (level IN ('high_school', 'university', 'exam_prep', 'professional'));
  END IF;

  -- Optional exam deadline
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'exam_date') THEN
    ALTER TABLE public.users ADD COLUMN exam_date DATE;
  END IF;

  -- When onboarding was completed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'onboarding_completed_at') THEN
    ALTER TABLE public.users ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;

  -- Free generation tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'has_used_free_generation') THEN
    ALTER TABLE public.users ADD COLUMN has_used_free_generation BOOLEAN DEFAULT FALSE;
  END IF;

  -- Subscription tier
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_tier') THEN
    ALTER TABLE public.users ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'lifetime'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON public.users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_level ON public.users(level);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);

-- Update trigger for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, avatar_url,
    onboarding_completed, has_used_free_generation, subscription_tier
  )
  VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE, FALSE, 'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON public.users TO authenticated;
