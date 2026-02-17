-- Fix Summarizer Saving - Run this in Supabase SQL Editor
-- This creates the summaries table and sets up proper permissions

-- Create summaries table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'pdf', 'youtube', 'website'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS summaries_user_id_idx ON public.summaries(user_id);
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON public.summaries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can create their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can delete their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Service role has full access to summaries" ON public.summaries;

-- Users can SELECT their own summaries
CREATE POLICY "Users can view their own summaries" ON public.summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can INSERT their own summaries
CREATE POLICY "Users can create their own summaries" ON public.summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own summaries
CREATE POLICY "Users can delete their own summaries" ON public.summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access (for API routes)
CREATE POLICY "Service role has full access to summaries" ON public.summaries
  FOR ALL
  USING (auth.role() = 'service_role');

-- Verify the table was created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'summaries'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'summaries';

-- ✅ If you see the table columns and policies listed above, it worked!
-- You can now save summaries in the app.
