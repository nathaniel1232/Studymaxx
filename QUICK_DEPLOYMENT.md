# 🚀 QUICK START - PRODUCTION DEPLOYMENT

**Use this to launch your app in 15 minutes**

---

## Step 1: Prepare Database (5 min)

### Open Supabase Dashboard
```
https://supabase.com/dashboard
→ Select "studymaxx" project
→ Click "SQL Editor"
→ Click "New Query"
```

### Copy & Paste This SQL:
```sql
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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "service_role_all" ON public.users
  FOR ALL USING (auth.role() = 'service_role');
```

### Run It
Click **RUN** (or Ctrl+Enter)  
✅ Expected: "Success. No rows returned"

---

## Step 2: Verify Environment Variables (2 min)

### Check `.env.local` has all 8 keys:
```
OPENAI_API_KEY=sk_proj_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
STRIPE_SECRET_KEY=sk_live_... (must be sk_live_, not sk_test_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (must be pk_live_)
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

⚠️ **CRITICAL:** Stripe keys must have `live_` not `test_`

---

## Step 3: Deploy to Vercel (5 min)

### Push Code
```bash
cd c:\Users\edu8042119\studymaxx

git add .
git commit -m "Production ready - first customer launch"
git push origin main
```

### Deploy
Option A (Recommended):
```bash
vercel deploy --prod
```

Option B (Via Dashboard):
- Go to vercel.com
- Select your project
- It auto-deploys from main branch

### Get Your URL
After deploy completes:
```
🎉 Deployment complete!
https://yourapp.vercel.app

Copy this - you'll need it next.
```

---

## Step 4: Configure Stripe Webhook (3 min)

### Open Stripe Dashboard
```
https://dashboard.stripe.com
→ Developers (left sidebar)
→ Webhooks
→ Find your endpoint (or create new)
```

### Update Webhook URL
**Change from:** `https://localhost:3000/api/stripe/webhook`  
**Change to:** `https://yourapp.vercel.app/api/stripe/webhook`

Save the webhook

### Verify Events Enabled
Make sure these are checked:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.deleted`
- ✅ `customer.subscription.updated`

---

## Step 5: Add Environment Variables to Vercel (2 min)

### Go to Vercel Project Settings
```
https://vercel.com/[your-team]/[project-name]/settings/environment-variables
```

### Add All 8 Variables
Copy-paste from your `.env.local`:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_WEBHOOK_SECRET`

⚠️ Make sure variables are "Vercel (All)" and "Production"

### Redeploy
```bash
vercel deploy --prod
```

---

## Step 6: Test It Works (2 min)

### Test 1: Visit Your App
```
https://yourapp.vercel.app
```

✅ Should load without errors

### Test 2: Create Flashcards
1. Click "Create new study set"
2. Paste some text
3. Click "Generate"
4. ✅ Should see flashcards in 10 seconds

### Test 3: Premium Modal
1. Click PDF button
2. ✅ Should show "Ascend to Premium" modal
3. Verify pricing displays in your currency

### Test 4: Payment Test (Optional)
1. Click "Ascend to Premium"
2. Test card: `4242 4242 4242 4242`
3. Date: Any future date
4. CVC: Any 3 digits
5. ✅ Should complete checkout
6. ⚠️ Don't actually complete - just verify it works

---

## 🎯 You're Live!

Once all steps done:
- ✅ App is live at `https://yourapp.vercel.app`
- ✅ Payments work
- ✅ Flashcard generation works
- ✅ Users can sign up and upgrade
- ✅ You're ready for customers!

---

## 🆘 Quick Troubleshooting

### "Supabase not configured" error
**Fix:** Check `NEXT_PUBLIC_SUPABASE_URL` and keys are in Vercel env vars

### "Can't generate flashcards"
**Fix:** Check `OPENAI_API_KEY` is valid in Vercel env vars

### "Stripe button doesn't work"
**Fix:** Check `STRIPE_PRICE_ID_MONTHLY` is set in Vercel

### "Webhook not working"
**Fix:** Verify webhook URL in Stripe matches Vercel domain

### Still stuck?
Check `PRODUCTION_LAUNCH_CHECKLIST.md` for detailed guide

---

## 📞 Key Links

- App: `https://yourapp.vercel.app`
- Vercel: `https://vercel.com/dashboard`
- Stripe: `https://dashboard.stripe.com`
- Supabase: `https://supabase.com/dashboard`

---

**That's it! You're production-ready.** 🚀

Send your customer the `CUSTOMER_ONBOARDING_GUIDE.md` to get them started.
