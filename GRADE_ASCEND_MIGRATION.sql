-- ===========================================
-- Grade Ascend Onboarding — New Columns
-- ===========================================
-- Run this in your Supabase SQL Editor to add
-- the columns for the new personalization onboarding.
--
-- Safe to run multiple times (IF NOT EXISTS checks).

DO $$
BEGIN
  -- Stores the raw onboarding answers (JSON)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'users'
                 AND column_name = 'grade_ascend_data') THEN
    ALTER TABLE public.users ADD COLUMN grade_ascend_data JSONB;
  END IF;

  -- Stores the computed personalization profile (JSON)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'users'
                 AND column_name = 'personalization_profile') THEN
    ALTER TABLE public.users ADD COLUMN personalization_profile JSONB;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.users.grade_ascend_data IS 'Raw answers from the Grade Ascend onboarding flow (firstName, gradeLevel, targetGrade, struggles, etc.)';
COMMENT ON COLUMN public.users.personalization_profile IS 'Computed personalization settings derived from onboarding answers (difficulty, aiTone, features, etc.)';
