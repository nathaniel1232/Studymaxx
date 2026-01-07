-- Problem Reports Table
-- Stores user-submitted bug reports and feedback

CREATE TABLE IF NOT EXISTS problem_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL DEFAULT 'anonymous',
  problem_type TEXT NOT NULL CHECK (problem_type IN ('bug', 'feature', 'quality', 'performance', 'other')),
  description TEXT NOT NULL,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_problem_reports_created_at ON problem_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_reports_status ON problem_reports(status);

-- Row Level Security (disable for this table - admin only access)
ALTER TABLE problem_reports ENABLE ROW LEVEL SECURITY;

-- No user policies - only service role can access
CREATE POLICY "Service role can manage reports"
  ON problem_reports
  FOR ALL
  USING (auth.role() = 'service_role');
