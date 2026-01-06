-- Folders Table (Subjects)
-- Allows users to organize flashcard sets into folders

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_folder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_folder_per_user UNIQUE(user_id, name)
);

-- Add folder_id to flashcard_sets (nullable for backward compatibility)
ALTER TABLE flashcard_sets 
ADD COLUMN IF NOT EXISTS folder_id UUID,
ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;

-- Index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_folder_id ON flashcard_sets(folder_id);

-- Row Level Security for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- IMPORTANT: Create default "Unsorted" folder for all existing users
-- This ensures backward compatibility
INSERT INTO folders (user_id, name)
SELECT DISTINCT user_id, 'Unsorted'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM folders WHERE folders.user_id = users.id AND folders.name = 'Unsorted'
);
