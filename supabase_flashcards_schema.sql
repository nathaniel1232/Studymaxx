-- Flashcard Sets Table
-- Stores user flashcard sets in database for cross-device sync

CREATE TABLE IF NOT EXISTS flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_studied TIMESTAMP WITH TIME ZONE,
  study_count INTEGER DEFAULT 0,
  cards JSONB NOT NULL, -- Array of flashcard objects
  is_shared BOOLEAN DEFAULT FALSE,
  share_id TEXT UNIQUE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_share_id ON flashcard_sets(share_id);

-- Row Level Security (RLS)
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;

-- Users can read their own flashcard sets
CREATE POLICY "Users can view own flashcard sets"
  ON flashcard_sets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own flashcard sets
CREATE POLICY "Users can create own flashcard sets"
  ON flashcard_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own flashcard sets
CREATE POLICY "Users can update own flashcard sets"
  ON flashcard_sets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own flashcard sets
CREATE POLICY "Users can delete own flashcard sets"
  ON flashcard_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can view shared flashcard sets
CREATE POLICY "Anyone can view shared flashcard sets"
  ON flashcard_sets
  FOR SELECT
  USING (is_shared = true);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role has full access"
  ON flashcard_sets
  FOR ALL
  USING (auth.role() = 'service_role');
