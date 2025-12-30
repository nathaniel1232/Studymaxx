# 🔧 Complete Supabase Setup Guide

## ⚠️ IMPORTANT: Configure Supabase Dashboard

Authentication will NOT work until you configure these settings in your Supabase dashboard.

---

## Step 1: Open Your Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **zvcawkxlhzhldhydxliv**

---

## Step 2: Configure Authentication Providers

### Enable Email Provider (for Magic Links)

1. In the left sidebar, click **Authentication**
2. Click **Providers**
3. Find **Email** in the list
4. Toggle it **ON** (enable)
5. Make sure these settings are checked:
   - ✅ **Enable email provider**
   - ✅ **Confirm email** (can be OFF for testing)
6. Click **Save**

### Enable Google OAuth

1. Still in **Authentication > Providers**
2. Find **Google** in the list
3. Toggle it **ON**
4. You'll need to enter:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

**If you don't have Google OAuth credentials:**

1. Go to: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to **Credentials** > **Create Credentials** > **OAuth client ID**
5. Application type: **Web application**
6. Add Authorized redirect URIs:
   ```
   https://zvcawkxlhzhldhydxliv.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**
8. Paste them into Supabase **Google provider settings**
9. Click **Save**

---

## Step 3: Configure Redirect URLs

This is CRITICAL for authentication to work!

1. In Supabase, go to **Authentication > URL Configuration**
2. Set **Site URL** to:
   ```
   http://localhost:3000
   ```
3. Add **Redirect URLs** (click "+ Add" for each):
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

---

## Step 4: Test Authentication

### Option A: Use the Test Page

1. Open: http://localhost:3000/auth-test.html
2. Click **"Check Supabase Config"** - should show ✅
3. Enter your email and click **"Send Magic Link"**
4. Check your email (spam folder too!)
5. Click the link in the email
6. Should redirect back and show "✅ You are logged in!"

### Option B: Test in Your App

1. Go to: http://localhost:3000
2. Click **"Sign In"** button
3. Try any of these:
   - **Magic Link**: Enter email, check inbox, click link
   - **Google**: Click "Continue with Google", select account
   - **Email/Password**: Enter credentials and sign up/in

---

## Step 5: Verify Database Setup

Make sure your database has the users table:

1. In Supabase dashboard, go to **Table Editor**
2. Look for a table named **users**
3. If it doesn't exist, go to **SQL Editor** and run:

```sql
-- Create users table
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

-- Allow users to insert their own data
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

---

## Common Issues & Solutions

### ❌ "Magic link not arriving"

**Solutions:**
- Check spam/junk folder
- Verify Email provider is **enabled** in Supabase
- Check **Supabase > Logs** for email delivery errors
- Try a different email address
- Supabase free tier has limited emails per hour

### ❌ "PKCE code verifier not found"

**Solutions:**
- ✅ Already fixed! We're using `@supabase/ssr` now
- Make sure you restarted the dev server after installing
- Clear browser cookies and try again

### ❌ "Google login redirects but nothing happens"

**Solutions:**
- Verify **Google provider is enabled** in Supabase
- Check **Redirect URLs** are configured correctly
- Make sure Google OAuth credentials are correct
- Check browser console for errors

### ❌ "Invalid redirect URL"

**Solutions:**
- Go to **Authentication > URL Configuration**
- Add `http://localhost:3000/**` to Redirect URLs
- Add `http://localhost:3000/auth/callback` to Redirect URLs
- Click **Save** and try again

### ❌ "Email rate limit exceeded"

**Solutions:**
- Supabase free tier limits emails per hour
- Wait a few minutes and try again
- Or upgrade to paid tier for more emails

---

## Environment Variables Check

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zvcawkxlhzhldhydxliv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ You already have these configured!

---

## What You DON'T Need to Download

You **DO NOT** need to:
- ❌ Install PostgreSQL locally
- ❌ Install any database software
- ❌ Set up local authentication servers
- ❌ Download any additional npm packages (already installed)

Everything runs through Supabase's cloud service!

---

## Required Packages (Already Installed)

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x"
}
```

✅ These are already installed in your project!

---

## Testing Checklist

Use this checklist to verify everything works:

- [ ] Supabase Email provider enabled
- [ ] Supabase Google provider enabled (with credentials)
- [ ] Redirect URLs configured in Supabase
- [ ] Dev server running (`npm run dev`)
- [ ] Test page loads: http://localhost:3000/auth-test.html
- [ ] Magic link email arrives (check spam!)
- [ ] Clicking magic link logs you in
- [ ] Google OAuth redirects and logs you in
- [ ] Profile dropdown appears after login
- [ ] "Sign out" button works
- [ ] Staying logged in after page refresh

---

## Still Not Working?

1. **Check Supabase Status**: https://status.supabase.com/
2. **Check Browser Console**: Open DevTools (F12) and look for errors
3. **Check Terminal**: Look for error messages in the dev server
4. **Clear Everything**: Clear browser cookies, restart dev server
5. **Try Incognito Mode**: Rules out cookie/cache issues

---

## Next Steps

Once authentication is working:

1. ✅ Users can sign in and stay logged in
2. ✅ Profile dropdown shows their info
3. ✅ Data syncs to database automatically
4. ✅ Premium status is tracked
5. ✅ Study facts appear throughout the app

You're ready to use the app! 🎉
