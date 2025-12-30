# Authentication Setup & Testing Guide

## ✅ What's Been Fixed

### 1. **User Profile with Logout** 
- Added `UserProfileDropdown` component with:
  - User avatar with initials
  - Display name and email
  - Premium badge (if applicable)
  - Account menu
  - Sign out button
- Replaces simple text display in navigation

### 2. **Gmail/Google OAuth Login**
- Fixed auth callback route to properly exchange code for session
- Uses `exchangeCodeForSession()` for proper authentication
- Works with both magic link and OAuth providers

### 3. **Magic Link Email Authentication**
- Toggle between password and passwordless login
- Shows "Use magic link (passwordless)" option
- Displays confirmation when magic link is sent
- Properly redirects after clicking email link

### 4. **Study Facts Throughout UI**
- New `StudyFactBadge` component
- Shows random science-backed study facts
- Appears in multiple locations:
  - Home page (general facts)
  - Study view (testing/flashcard facts)
  - Saved sets view (spaced repetition facts)
  - Share dialog
- Expandable to show source citation
- Translates to Norwegian automatically

## 🔧 Supabase Configuration Required

For authentication to work, you need to configure Supabase:

### 1. Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Dashboard Setup

#### Enable Authentication Providers:
1. Go to Authentication > Providers
2. Enable **Email** provider (for magic links and passwords)
3. Enable **Google** provider:
   - Add your Google OAuth client ID
   - Add your Google OAuth client secret
   - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

#### Configure Redirect URLs:
1. Go to Authentication > URL Configuration
2. Add to "Site URL": `http://localhost:3000` (for development)
3. Add to "Redirect URLs":
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback` (for production)

#### Email Templates (Optional):
1. Go to Authentication > Email Templates
2. Customize the magic link email template
3. Make sure "Confirm signup" is enabled if using email/password

### 3. Database Setup
The `users` table with `is_premium` column should already exist from previous setup. If not, run:

```sql
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
```

## 🧪 Testing Instructions

### Test Magic Link Login:
1. Click "Sign In" button
2. Click "🪄 Use magic link (passwordless)"
3. Enter your email
4. Click "Send magic link"
5. Check your email (may be in spam)
6. Click the link in the email
7. Should redirect to homepage, logged in
8. Click your profile avatar to see dropdown
9. Click "Sign out" to test logout

### Test Google OAuth:
1. Click "Sign In" button
2. Click "Continue with Google"
3. Select your Google account
4. Should redirect back to the app, logged in
5. Profile dropdown should show your Google name/email

### Test Profile Features:
1. When logged in, click profile avatar
2. Dropdown shows:
   - User name and email
   - Premium badge (if premium)
   - Account option
   - Upgrade to Premium (if not premium)
   - Sign out button
3. Click anywhere outside to close dropdown
4. Test sign out

### Test Study Facts:
1. Go to homepage - see a random study fact
2. Click to expand and see source
3. Create a study set - see facts in study view
4. Go to saved sets - see spaced repetition facts
5. Facts should change on page reload
6. Facts translate based on language setting

## 🚨 Common Issues

### Magic Link Not Arriving:
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs in Dashboard > Logs
- May need to configure SMTP settings in Supabase

### Google Login Redirects but Not Logged In:
- Verify redirect URLs are configured
- Check browser console for errors
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct
- Try clearing browser cookies

### "Supabase not configured" Error:
- Environment variables not loaded
- Restart dev server after adding `.env.local`
- Check that variable names match exactly

### Profile Dropdown Not Showing:
- User data may not be loaded yet
- Check console for errors
- Verify `getCurrentUser()` is working

## 📝 Notes

- All auth happens client-side with Supabase
- User sessions are stored in browser cookies
- Premium status is fetched from database on login
- Study facts are selected randomly on component mount
- Facts context (general/flashcards/testing) determines which facts can appear

## 🎯 Next Steps

To fully enable authentication in production:
1. Add your domain to Supabase redirect URLs
2. Set up SMTP for reliable email delivery (optional, Supabase provides default)
3. Customize email templates with your branding
4. Add Google OAuth credentials from Google Cloud Console
5. Consider adding more OAuth providers (GitHub, Discord, etc.)
