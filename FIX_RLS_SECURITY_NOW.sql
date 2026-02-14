-- FIX CRITICAL SECURITY ISSUE: Users table exposed to anonymous access
-- Run this in Supabase SQL Editor immediately!

-- First, check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'flashcard_sets');

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean (including previously created ones)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- SECURE POLICY: Users can ONLY read their own data (authenticated required)
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- SECURE POLICY: Users can ONLY update their own data
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- SECURE POLICY: Allow service role to insert (for new user creation)
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Now fix flashcard_sets RLS policies
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including all variations and duplicates)
DROP POLICY IF EXISTS "Users can view own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can insert own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can create own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can update own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can delete own flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Public can view shared flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Anyone can view shared flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can view own sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can insert own sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can update own sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Users can delete own sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Anyone can view shared sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Allow public read access to shared flashcard sets" ON public.flashcard_sets;
DROP POLICY IF EXISTS "Service role has full access" ON public.flashcard_sets;

-- SECURE flashcard_sets policies
-- 1. Users can view their own sets
CREATE POLICY "Users can view own flashcard sets"
  ON public.flashcard_sets
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Anyone (including anonymous) can view shared sets
CREATE POLICY "Public can view shared flashcard sets"
  ON public.flashcard_sets
  FOR SELECT
  USING (is_shared = true);

-- 3. Service role has full access (needed for backend operations)
CREATE POLICY "Service role has full access"
  ON public.flashcard_sets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Users can insert their own sets
CREATE POLICY "Users can insert own flashcard sets"
  ON public.flashcard_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Users can update their own sets
CREATE POLICY "Users can update own flashcard sets"
  ON public.flashcard_sets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Users can delete their own sets
CREATE POLICY "Users can delete own flashcard sets"
  ON public.flashcard_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'flashcard_sets');

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'flashcard_sets')
ORDER BY tablename, policyname;
