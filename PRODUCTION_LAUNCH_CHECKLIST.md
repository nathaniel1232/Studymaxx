# 🚀 PRODUCTION LAUNCH CHECKLIST - StudyMaxx

**Prepared for:** Your First Customer  
**Status:** Ready for Production  
**Last Updated:** January 5, 2026

---

## 📋 PRE-LAUNCH STEPS (DO IN ORDER)

### STEP 1: Database Setup (⏱️ 5 minutes)
```bash
# 1. Open Supabase Dashboard
# https://supabase.com/dashboard

# 2. Select your "studymaxx" project

# 3. Click SQL Editor in sidebar

# 4. Create NEW QUERY and run:
```

**Paste this SQL into Supabase SQL Editor:**

```sql
-- Create users table with proper schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_premium BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  daily_ai_count INT DEFAULT 0,
  daily_ai_reset_date DATE,
  study_set_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Service role (webhooks) can update all
CREATE POLICY "service_role_all" ON public.users
  FOR ALL USING (auth.role() = 'service_role');
```

✅ Expected result: "Success. No rows returned"

---

### STEP 2: Set Yourself to Premium (For Testing)
```sql
-- Replace 'your-email@gmail.com' with your actual email
UPDATE public.users 
SET is_premium = TRUE, 
    updated_at = NOW()
WHERE email = 'your-email@gmail.com';
```

---

### STEP 3: Verify Environment Variables
Check your `.env.local` has these (should already exist):

```env
# OpenAI
OPENAI_API_KEY=sk_proj_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zvcawkxlhzhldhydxliv.supabase.co/
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe (LIVE KEYS - verify these are LIVE, not test)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

⚠️ **CRITICAL:** Ensure Stripe keys are `sk_live_` and `pk_live_` (not `sk_test_`)

---

## 🧪 FUNCTIONAL TEST (⏱️ 10 minutes)

### Test 1: Flashcard Generation (Free Path)
1. **Not logged in** → Home page
2. Click "Create new study set"
3. Select **Notes** as material
4. Paste some text (e.g., "The capital of France is Paris. Paris is known for the Eiffel Tower.")
5. Select a grade (e.g., "B")
6. Click "Generate Study Set"
7. ✅ Should see flashcards in < 10 seconds

### Test 2: Premium Feature Block (Free User)
1. Go back to input (click back)
2. Try clicking on **PDF** upload button
3. ✅ Should show "Ascend to Premium" modal
4. ✅ Modal should show pricing (29 kr/month or converted price)
5. Click "Maybe later" to close

### Test 3: Premium Feature Works (Premium User)
1. **Sign out** (if you're logged in)
2. Click "Sign In"
3. Sign in with Google or email
4. After login, click "Create new study set" again
5. Try clicking **PDF** button
6. ✅ Should let you upload without modal
7. Upload any PDF (or sample PDF from test/)
8. Generate flashcards from PDF

### Test 4: Premium Checkout
1. From home, click "Create new study set"
2. Try PDF upload (if not premium)
3. Click "Ascend to Premium" button
4. ✅ Should go to Stripe Checkout
5. ✅ Should show pricing in your currency (NOK, USD, EUR, etc.)
6. ⚠️ **DO NOT COMPLETE** - just verify the page looks good
7. Click back/cancel

### Test 5: Study Mode
1. Create a flashcard set (any material)
2. Click "Study"
3. ✅ Card shows question
4. Click "Show Answer"
5. ✅ Answer appears
6. Rate as "Good" (green)
7. ✅ Card should turn green/highlight
8. Click next
9. ✅ After all cards, should see summary
10. Click "Test Yourself"
11. ✅ Test mode starts with quiz
12. Answer a few questions
13. ✅ After all questions, show results

### Test 6: Language Switching
1. Go to Settings (⚙️)
2. Change Language to Norwegian
3. Go back to home
4. ✅ All text should be Norwegian
5. Create new study set
6. ✅ All buttons and labels in Norwegian

---

## 🔐 Stripe Webhook Verification

**These steps ensure payments will actually activate Premium:**

### Verify Webhook is Configured
1. Go to Stripe Dashboard → Developers → Webhooks
2. Look for endpoint: `https://yourdomain.com/api/stripe/webhook`
3. ✅ Should show "Active"
4. ✅ Should have recent successful events

### Test Webhook (Local Only)
```bash
# If testing locally, use Stripe CLI:
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Keep this running in terminal
```

### Live Webhook (Production)
- Stripe will automatically send events to your domain
- Webhook secret in `.env.local` must match Stripe dashboard
- Events that update `is_premium`:
  - `checkout.session.completed` → activate premium
  - `customer.subscription.updated` → update status
  - `customer.subscription.deleted` → cancel premium

---

## 📱 User Experience Test

### Test with a Fresh Account
1. Visit your app in a private/incognito window
2. **Don't sign in** → see free experience
3. Can only use Notes (no PDF, YouTube, Images)
4. Create 1 study set, try to create second
5. ✅ Should get "Free limit" message
6. Sign in with new Google account
7. ✅ Premium badge shown if they're premium
8. Try PDF/YouTube → should work (or show upgrade modal)

### Test Payment Flow (Sandbox)
⚠️ **Important:** Use Stripe test card to verify workflow:

**Test Card:** `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)

1. Click "Ascend to Premium"
2. Use test card above
3. Complete checkout
4. ✅ Should redirect back with `?premium=success`
5. ✅ Should show success toast
6. ✅ Refresh page and check user is premium
7. PDF/YouTube should work immediately

---

## 🚀 Deployment Steps

### 1. Deploy to Vercel (Recommended)
```bash
# Push code to GitHub
git add .
git commit -m "Production ready"
git push origin main

# Deploy via Vercel dashboard or:
vercel deploy --prod
```

### 2. Add Environment Variables in Vercel
1. Go to Vercel Project Settings
2. Environment Variables
3. Add all keys from `.env.local`:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_ID_MONTHLY`
   - `STRIPE_WEBHOOK_SECRET`

### 3. Update Stripe Webhook URL
1. Go to Stripe Developers → Webhooks
2. Find your webhook endpoint
3. **Change URL from** `https://localhost:3000/api/stripe/webhook`
4. **To:** `https://yourdomain.vercel.app/api/stripe/webhook`
5. Update webhook secret if changed

### 4. Update Supabase Auth URLs
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. **Site URL:** `https://yourdomain.vercel.app`
3. **Redirect URLs:** Add `https://yourdomain.vercel.app/auth/callback`

### 5. Test Production
```bash
# Visit your live domain
https://yourdomain.vercel.app

# Test the full flow:
# 1. Sign in
# 2. Create flashcard set
# 3. Try premium feature
# 4. Upgrade and complete payment
```

---

## ✅ Final Checklist

- [ ] Supabase users table created
- [ ] Environment variables set (all 8 required)
- [ ] Free path works (no login needed for Notes)
- [ ] Premium feature blocks work (PDF, YouTube, Image)
- [ ] Login/Sign up works
- [ ] Study mode works
- [ ] Test mode works
- [ ] Stripe checkout loads
- [ ] Language switching works
- [ ] App deployed to production
- [ ] Stripe webhook endpoint updated
- [ ] Supabase auth URLs configured
- [ ] Test payment flow (with test card)
- [ ] Verified database is connected

---

## 🎯 Success Indicators

Your app is ready for production when:

1. ✅ Free users can create flashcards from **Notes only**
2. ✅ Clicking PDF/YouTube/Images shows "Ascend to Premium" modal
3. ✅ Premium users can use all features
4. ✅ Stripe checkout works and loads in customer's currency
5. ✅ After payment, webhook activates premium automatically
6. ✅ App is live on your domain
7. ✅ No errors in browser console or Vercel logs

---

## 🆘 Troubleshooting

### Issue: PDF/YouTube buttons don't show modal
**Fix:** User is logged in but hasn't paid yet
1. Check if they're actually logged in
2. Check Supabase dashboard → users table → is their `is_premium = false`?

### Issue: Can't generate flashcards
**Fix:** Could be API key issue
1. Check `OPENAI_API_KEY` is valid in Vercel env vars
2. Check Vercel logs: `vercel logs`
3. Check browser console for error messages

### Issue: Premium didn't activate after payment
**Fix:** Webhook not working
1. Check Stripe webhook logs → recent events
2. Check Vercel logs for webhook errors
3. Manually activate: Run SQL `UPDATE users SET is_premium = true WHERE email = '...'`

### Issue: "Supabase not configured" error
**Fix:** Missing environment variables
1. Check all 3 Supabase keys are in `.env.local`
2. Restart dev server: `npm run dev`
3. In production: Check Vercel env vars are set

---

## 📞 Support

Your first customer needs smooth experience. If issues arise:

1. **Check Console:** Open Dev Tools (F12) → Console tab
2. **Check Logs:** Vercel Dashboard → Logs → Recent
3. **Test Locally:** `npm run dev` and reproduce issue locally
4. **Check Database:** Supabase Dashboard → SQL Editor → Check users table

---

## 🎉 You're Ready!

Your app has all features working:
- ✅ Flashcard generation from multiple sources
- ✅ Study and test modes
- ✅ Premium system with Stripe integration
- ✅ Authentication with Google OAuth
- ✅ Bilingual support (English/Norwegian)
- ✅ Dark mode support

**Make your first customer successful!** 🚀
