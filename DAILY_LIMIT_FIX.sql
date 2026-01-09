-- ===============================================
-- DAILY FLASHCARD LIMIT FIX
-- ===============================================
-- This script fixes the mismatch between schema and code
-- The code expects: daily_ai_count, last_ai_reset
-- The schema had: daily_generation_count, last_generation_date
--
-- Run this in your Supabase SQL Editor to fix the daily limit feature
-- ===============================================

-- Step 1: Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS daily_ai_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ai_reset TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Migrate data from old columns if they exist
DO $$ 
BEGIN
  -- If old daily_generation_count exists, copy to new daily_ai_count
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'users' 
             AND column_name = 'daily_generation_count') THEN
    UPDATE public.users 
    SET daily_ai_count = COALESCE(daily_generation_count, 0)
    WHERE daily_ai_count = 0;
  END IF;

  -- If old last_generation_date exists, copy to new last_ai_reset
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'users' 
             AND column_name = 'last_generation_date') THEN
    UPDATE public.users 
    SET last_ai_reset = COALESCE(
      CAST(last_generation_date AS TIMESTAMPTZ) + INTERVAL '1 day',
      NOW()
    )
    WHERE last_ai_reset = NOW();
  END IF;
END $$;

-- Step 3: Create index on last_ai_reset for performance
CREATE INDEX IF NOT EXISTS idx_users_last_ai_reset ON public.users(last_ai_reset);

-- Step 4: Verify the schema
-- Run this query to check if everything is correct:
-- SELECT id, email, daily_ai_count, last_ai_reset, is_premium FROM public.users LIMIT 5;

-- ===============================================
-- HOW IT WORKS:
-- ===============================================
-- 1. Each user gets 3 free AI generations per 24 hours (daily_ai_count)
-- 2. The counter resets at midnight UTC (based on last_ai_reset timestamp)
-- 3. Premium users have unlimited generations
-- 4. When user hits 3, they get a "Upgrade to Premium" message
-- 5. At midnight UTC, daily_ai_count resets to 0 automatically in /api/generate
-- ===============================================
