-- ============================================================
-- STUDY PLANS TABLE
-- Run this in Supabase SQL Editor to create the study_plans table.
-- This enables the exam-based study plan feature for premium users.
-- ============================================================

-- 1. Create study_plans table
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  exam_date DATE,
  exam_subject TEXT,
  daily_minutes INTEGER NOT NULL DEFAULT 30,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_exam_date ON study_plans(exam_date);

-- 3. Enable RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own plans" ON study_plans;
CREATE POLICY "Users can view own plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plans" ON study_plans;
CREATE POLICY "Users can insert own plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plans" ON study_plans;
CREATE POLICY "Users can update own plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plans" ON study_plans;
CREATE POLICY "Users can delete own plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Done! Now the study plan feature will work.
