-- =============================================
-- SETUP SUMMARIES TABLE FOR SUMMARIZER FEATURE
-- Run this in Supabase SQL Editor
-- =============================================

-- Create summaries table for storing user summaries
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  summary TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text' CHECK (source_type IN ('text', 'pdf', 'youtube', 'website')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON public.summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON public.summaries(created_at DESC);

-- Enable RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Service role full access on summaries" ON public.summaries;

-- Users can read their own summaries
CREATE POLICY "Users can read own summaries"
  ON public.summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own summaries
CREATE POLICY "Users can insert own summaries"
  ON public.summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own summaries
CREATE POLICY "Users can delete own summaries"
  ON public.summaries FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access (for API routes)
CREATE POLICY "Service role full access on summaries"
  ON public.summaries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verify setup
SELECT 
  'Summaries table created successfully!' as status,
  COUNT(*) as existing_summaries
FROM public.summaries;
