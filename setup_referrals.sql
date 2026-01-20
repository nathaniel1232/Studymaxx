-- 1. Add referral code to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;

-- 2. Create Referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.users(id),
    referred_id UUID REFERENCES public.users(id), -- The new user
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referred_id) -- A user can only be referred once
);

-- 3. Create Commissions table to track earnings per invoice
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.users(id),
    amount INTEGER, -- Amount in cents
    stripe_invoice_id TEXT UNIQUE,
    status TEXT DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Simple function to generate referral codes if needed (optional)
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := substring(md5(random()::text) from 1 for 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code on user creation
DROP TRIGGER IF EXISTS tr_generate_referral_code ON public.users;
CREATE TRIGGER tr_generate_referral_code
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();
