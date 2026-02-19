-- Create affiliate_applications table for storing affiliate program applications
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  tiktok_handle TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS affiliate_applications_email_idx ON public.affiliate_applications(email);
CREATE INDEX IF NOT EXISTS affiliate_applications_status_idx ON public.affiliate_applications(status);
CREATE INDEX IF NOT EXISTS affiliate_applications_created_at_idx ON public.affiliate_applications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT their own affiliate application (no auth required for form submission)
CREATE POLICY "Allow public to insert affiliate applications"
  ON public.affiliate_applications
  FOR INSERT
  WITH CHECK (true);

-- Allow only authenticated admins to view all applications
CREATE POLICY "Allow authenticated users to view affiliate applications"
  ON public.affiliate_applications
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update applications
CREATE POLICY "Allow updates to applications"
  ON public.affiliate_applications
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Grant permissions to service role
GRANT ALL ON public.affiliate_applications TO postgres, anon, authenticated, service_role;

-- Create function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_affiliate_applications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely create trigger only if it doesn't exist yet (no DROP needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'affiliate_applications_updated_at_trigger'
  ) THEN
    CREATE TRIGGER affiliate_applications_updated_at_trigger
      BEFORE UPDATE ON public.affiliate_applications
      FOR EACH ROW
      EXECUTE FUNCTION public.update_affiliate_applications_timestamp();
  END IF;
END;
$$;

