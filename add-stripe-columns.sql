-- Add missing Stripe columns to users table
-- Copy this entire file and run in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Add stripe_customer_id column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add stripe_subscription_id column  
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Verify columns were added
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name IN ('stripe_customer_id', 'stripe_subscription_id')
ORDER BY column_name;

