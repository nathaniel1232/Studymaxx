-- Add email campaign tracking columns to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS practice_reminder_sent_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS premium_unlock_email_sent_at TIMESTAMP DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_welcome_email ON users(is_premium) WHERE welcome_email_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_practice_reminder ON users(is_premium) WHERE practice_reminder_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_premium_unlock ON users(is_premium) WHERE premium_unlock_email_sent_at IS NULL;
