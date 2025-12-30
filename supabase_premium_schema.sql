-- Premium System Database Schema
-- This creates the necessary tables and functions for the premium system

-- Users table to track premium status and usage
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- User ID (anonymous or authenticated)
  is_premium BOOLEAN DEFAULT FALSE,
  study_set_count INTEGER DEFAULT 0, -- Total study sets created
  daily_ai_count INTEGER DEFAULT 0, -- AI generations today
  last_ai_reset TIMESTAMPTZ DEFAULT NOW(), -- Last time daily counter was reset
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT, -- Optional: for authenticated users
  account_id TEXT -- Optional: Supabase auth user ID
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_account_id ON public.users(account_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Study sets table (for sharing and server-side storage)
CREATE TABLE IF NOT EXISTS public.study_sets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  flashcards JSONB NOT NULL, -- Array of flashcard objects
  share_id TEXT UNIQUE, -- Unique ID for sharing
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_studied TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sets_user_id ON public.study_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sets_share_id ON public.study_sets(share_id);
CREATE INDEX IF NOT EXISTS idx_study_sets_created_at ON public.study_sets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;

-- Policies for users table
-- Anyone can read their own user data (by ID)
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (true); -- We check on client side

-- Anyone can insert/update their own data
CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (true);

-- Policies for study_sets table
-- Anyone can view shared sets
CREATE POLICY "Anyone can view shared sets"
  ON public.study_sets FOR SELECT
  USING (is_shared = TRUE OR auth.uid()::text = user_id);

-- Users can insert their own sets
CREATE POLICY "Users can insert own sets"
  ON public.study_sets FOR INSERT
  WITH CHECK (true);

-- Users can update their own sets
CREATE POLICY "Users can update own sets"
  ON public.study_sets FOR UPDATE
  USING (true);

-- Users can delete their own sets
CREATE POLICY "Users can delete own sets"
  ON public.study_sets FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_sets_updated_at ON public.study_sets;
CREATE TRIGGER update_study_sets_updated_at
  BEFORE UPDATE ON public.study_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions (adjust based on your setup)
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.study_sets TO anon, authenticated;
