-- Create feedback table for user bug reports and feature requests
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('bug', 'feature', 'other')),
  message TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Index for filtering by type and resolved status
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_resolved ON feedback(resolved);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (no auth required)
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT
  WITH CHECK (true);

-- Only service role can read feedback (for admin)
CREATE POLICY "Service role can read feedback" ON feedback
  FOR SELECT
  USING (auth.role() = 'service_role');
