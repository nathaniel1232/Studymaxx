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
-- Only if the table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'flashcard_sets') THEN
    
    -- Add folder_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'flashcard_sets' 
                   AND column_name = 'folder_id') THEN
      ALTER TABLE flashcard_sets ADD COLUMN folder_id UUID;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_folder' 
                   AND table_name = 'flashcard_sets') THEN
      ALTER TABLE flashcard_sets 
      ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
    END IF;
    
    -- Create index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE indexname = 'idx_flashcard_sets_folder_id') THEN
      CREATE INDEX idx_flashcard_sets_folder_id ON flashcard_sets(folder_id);
    END IF;
  END IF;
END $$;

-- Index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

-- Row Level Security for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
DROP POLICY IF EXISTS "Users can create own folders" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON folders;

-- Create policies
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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'users') THEN
    INSERT INTO folders (user_id, name)
    SELECT DISTINCT id, 'Unsorted'
    FROM users
    WHERE NOT EXISTS (
      SELECT 1 FROM folders WHERE folders.user_id = users.id AND folders.name = 'Unsorted'
    );
  END IF;
END $$;
