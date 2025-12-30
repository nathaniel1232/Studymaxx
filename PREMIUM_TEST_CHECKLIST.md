# 🧪 PREMIUM SYSTEM - TEST CHECKLIST

## ⚠️ DO NOT LAUNCH WITHOUT COMPLETING ALL TESTS

This checklist ensures the Premium system works correctly and protects against abuse.

---

## 📋 PRE-LAUNCH CHECKLIST

### ✅ 1. Stripe Setup
- [ ] Stripe account created
- [ ] Product created in Stripe Dashboard ("StudyMaxx Premium")
- [ ] Price created (29 NOK/month recurring)
- [ ] Price ID added to environment: `STRIPE_PRICE_ID_MONTHLY`
- [ ] Webhook endpoint created: `https://yourdomain.com/api/stripe/webhook`
- [ ] Webhook secret added to environment: `STRIPE_WEBHOOK_SECRET`
- [ ] Webhook listens to events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.deleted`
  - [ ] `customer.subscription.updated`
  - [ ] `invoice.payment_failed`

### ✅ 2. Environment Variables
Verify all are set in production:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...  # Use test key first!
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
```

### ✅ 3. Database Schema
- [ ] Run migration on production Supabase:
```sql
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS study_set_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_ai_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ai_reset TIMESTAMPTZ DEFAULT NOW();
```
- [ ] Verify columns exist
- [ ] Test user insert/update

---

## 🧪 FUNCTIONAL TESTS

### TEST 1: Free User Flow ✅
**Goal:** Free user hits limit and sees Premium modal

1. [ ] Open app in incognito
2. [ ] Create first study set → Should work
3. [ ] Try to create second study set → Premium modal appears
4. [ ] Modal shows:
   - [ ] "Ascend to Premium" title
   - [ ] 29 NOK/month price
   - [ ] Feature list
   - [ ] "Ascend to Premium" button
   - [ ] "Maybe later" button
5. [ ] Click "Maybe later" → Modal closes
6. [ ] Click on Premium card → Modal opens again

**Pass criteria:** Free user can create 1 set, then blocked with clear upgrade path

---

### TEST 2: Daily AI Limit ✅
**Goal:** Free user hits daily limit

1. [ ] Reset user in database:
```sql
UPDATE users SET study_set_count = 0, daily_ai_count = 1 WHERE id = 'user-id';
```
2. [ ] Try to generate flashcards
3. [ ] Should see modal with:
   - [ ] ⏰ icon (not ⚡)
   - [ ] "Daily Limit Reached" title
   - [ ] Message about coming back tomorrow
4. [ ] Click "Ascend to Premium" → Redirects to Stripe

**Pass criteria:** Daily limit enforced, clear messaging

---

### TEST 3: Stripe Checkout Flow ✅
**Goal:** User completes payment successfully

1. [ ] Click "Ascend to Premium" in modal
2. [ ] Redirected to Stripe Checkout
3. [ ] Use test card: `4242 4242 4242 4242`
4. [ ] Complete payment
5. [ ] Redirected back to app with `?premium=success`
6. [ ] Check database:
```sql
SELECT id, is_premium FROM users WHERE id = 'user-id';
```
7. [ ] `is_premium` should be `true`

**Pass criteria:** Payment → Webhook → Database updated

---

### TEST 4: Premium User Experience ✅
**Goal:** Premium user has no limits

1. [ ] Manually set user to premium:
```sql
UPDATE users SET is_premium = true WHERE id = 'user-id';
```
2. [ ] Create 5+ study sets → All work
3. [ ] Generate 10+ flashcard sets → All work
4. [ ] Click PDF/YouTube → Not blocked
5. [ ] No premium modals appear

**Pass criteria:** Premium users never see limitations

---

### TEST 5: Subscription Cancellation ✅
**Goal:** Cancelled subscription removes Premium

1. [ ] Go to Stripe Dashboard
2. [ ] Find customer subscription
3. [ ] Cancel subscription
4. [ ] Wait for webhook (few seconds)
5. [ ] Check database:
```sql
SELECT id, is_premium FROM users WHERE id = 'user-id';
```
6. [ ] `is_premium` should be `false`
7. [ ] Try to create study set → Blocked

**Pass criteria:** Cancellation → Webhook → Premium removed

---

### TEST 6: Rate Limiting (Anti-Abuse) ✅
**Goal:** Prevent account spam

1. [ ] Make 5 AI requests from same IP
2. [ ] 6th request should fail with 429 error
3. [ ] Error message: "Too many requests from your IP..."
4. [ ] Wait 1 hour OR test with different IP
5. [ ] Should work again

**Pass criteria:** IP-based rate limiting works

---

### TEST 7: Login Persistence ✅
**Goal:** Premium status persists across sessions

1. [ ] User has Premium
2. [ ] Close browser
3. [ ] Open app in new session
4. [ ] Premium status still active
5. [ ] Can use Premium features

**Pass criteria:** Premium doesn't reset on logout/login

---

## 🚨 EDGE CASES

### TEST 8: Payment Failed
1. [ ] Use declined test card: `4000 0000 0000 0002`
2. [ ] Payment should fail
3. [ ] User should NOT get Premium
4. [ ] Error shown in Stripe checkout

### TEST 9: Webhook Replay Attack
1. [ ] Webhook signature verification prevents fake webhooks
2. [ ] Try sending fake webhook → Should fail

### TEST 10: Multiple Subscriptions
1. [ ] User tries to subscribe twice
2. [ ] Second subscription should update, not duplicate

---

## 📊 MONITORING

### Post-Launch Checks (Daily)

1. [ ] Check Stripe Dashboard for revenue
2. [ ] Monitor OpenAI API costs
3. [ ] Check Supabase for database errors
4. [ ] Review rate limit logs
5. [ ] Check webhook delivery status

### Cost Monitoring
- Free users: ~$0.02/month (30 × $0.0006)
- Premium users: ~$0.06/month (100 × $0.0006)
- Revenue per Premium: 29 NOK ≈ $2.70
- Margin: $2.64/month per Premium user

**Alert if:**
- OpenAI costs > $1/day
- Webhook failures > 5%
- Rate limit hits > 100/hour

---

## ✅ SIGN-OFF

When all tests pass, sign here:

**Tested by:** _________________  
**Date:** _________________  
**Environment:** [ ] Staging [ ] Production  
**All tests passed:** [ ] YES [ ] NO  

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## 🐛 Common Issues

### Issue: Webhook not triggered
**Fix:** 
- Check Stripe webhook logs
- Verify webhook secret matches
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Issue: User still sees limits after payment
**Fix:**
- Check database: `SELECT * FROM users WHERE id = 'user-id'`
- Check Stripe logs for webhook delivery
- Manually set: `UPDATE users SET is_premium = true WHERE id = 'user-id'`

### Issue: Rate limiting too aggressive
**Fix:**
- Adjust limits in `app/utils/rateLimit.ts`
- Check IP detection in logs
- Premium users should have 100 limit, not 5

### Issue: Modal doesn't show Stripe button
**Fix:**
- Check browser console for errors
- Verify `/api/stripe/checkout` endpoint works
- Check STRIPE_PRICE_ID_MONTHLY is set

---

## 📞 Emergency Contacts

- Stripe Support: https://support.stripe.com
- OpenAI Support: https://help.openai.com
- Supabase Support: https://supabase.com/support
- App Email: studymaxxer@gmail.com
