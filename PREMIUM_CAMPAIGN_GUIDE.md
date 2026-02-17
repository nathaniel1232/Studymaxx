# Premium Upgrade Email Campaign Guide

## Your Current Stats
- **Total Users:** 1,500+
- **Premium Users:** ~50
- **Conversion Rate:** 3.3%

### Is 3.3% Good?
**YES!** Industry benchmarks for freemium SaaS products:
- Average: 2-5% conversion rate
- Good: 5-10%
- Excellent: 10%+

**Your 3.3% is solid**, but there's room to grow to 5-7% with strategic campaigns.

---

## How to Improve Conversion Rate

### 1. **Email Campaigns** (What we're doing now)
- Expected lift: +1-2% conversion rate
- Send to free users who've been active in last 30 days
- Use urgency (limited time offer) + social proof

### 2. **In-App Prompts**
- Show premium features when users hit limits
- Add "Upgrade" button in daily limit messages
- Display "50+ students upgraded this week" banner

### 3. **Limited-Time Offers**
- 50% off for first month
- Student discount (25% off with .edu email)
- Annual plan discount (2 months free)

### 4. **Better Onboarding**
- Show new users premium features immediately
- Offer 3-day free trial
- Highlight most popular premium features

### 5. **Social Proof**
- Add testimonials to pricing page
- Show "1,500+ students trust StudyMaxx"
- Display live counter of premium upgrades

---

## Running This Email Campaign

### Step 1: Get User List from Supabase

Run this SQL in Supabase SQL Editor:

\`\`\`sql
-- Get free users who've been active (created flashcards or used AI)
SELECT DISTINCT email
FROM users
WHERE is_premium = false
  AND email IS NOT NULL
  AND email != ''
  AND created_at >= NOW() - INTERVAL '90 days'  -- Active in last 3 months
ORDER BY created_at DESC;
\`\`\`

Export as CSV, then convert to JavaScript array.

### Step 2: Set Up Resend

1. **Get Resend API Key:**
   - Go to https://resend.com/dashboard
   - Copy your API key
   - Add to environment: `export RESEND_API_KEY="re_xxxxx"`

2. **Verify Your Domain:**
   - In Resend dashboard, add studymaxx.net
   - Add DNS records they provide
   - Wait for verification (~10 minutes)

3. **Update Sender Email:**
   - Change `FROM_EMAIL` in script to your verified domain
   - Example: `StudyMaxx <hello@studymaxx.net>`

### Step 3: Test First!

\`\`\`javascript
// In send-premium-campaign.js, test with your own email first:
const users = [
  { email: 'your-email@gmail.com' }  // Test with yourself!
];
\`\`\`

Run: `node send-premium-campaign.js`

### Step 4: Send to Real Users

\`\`\`javascript
// Add your real users (example format):
const users = [
  { email: 'student1@example.com' },
  { email: 'student2@example.com' },
  // ... up to 1,450 free users
];
\`\`\`

Run: `node send-premium-campaign.js`

---

## Expected Results

### Conservative Estimates:
- **Email Open Rate:** 20-30% (290-435 opens)
- **Click-Through Rate:** 3-5% (45-72 clicks)
- **Conversion Rate:** 5-10% of clicks (2-7 new premium users)

### If 7 Users Upgrade:
- **Revenue:** 7 × $4.99 = $34.93/month
- **Annual Value:** $419/year
- **Improved Conversion Rate:** 3.3% → 3.8%

### Repeat Monthly:
If you send targeted campaigns monthly, you could add **5-10 premium users per month**, which would double your premium base in 6 months.

---

## Best Practices

### DO:
✅ Send between 10 AM - 2 PM on Tuesday/Wednesday (highest open rates)
✅ A/B test subject lines:
   - "🎓 Unlock StudyMaxx Premium - 50% OFF for You!"
   - "Study Smarter: Your Premium Upgrade is Ready"
   - "Join 50+ Students Who Upgraded to Premium"
✅ Follow up after 7 days with non-openers
✅ Track clicks with UTM parameters (already in email)
✅ Monitor unsubscribe rate (should be <0.5%)

### DON'T:
❌ Send to users who signed up <7 days ago (too soon)
❌ Send to inactive users (>6 months old)
❌ Send more than 2 promotional emails per month
❌ Use spam trigger words: "FREE!!!", "ACT NOW!!!", "LIMITED!!!"

---

## Monitoring Results

### In Resend Dashboard:
- Track open rates
- Monitor click-through rates
- Check bounce/complaint rates

### In Stripe Dashboard:
- Watch for subscription spikes
- Track upgrade source (check UTM parameters)

### Goal:
Aim for **10-15 premium upgrades** from this campaign (20% lift).

---

## Advanced Strategies (Future)

1. **Referral Program:** Give 1 month free for each friend who upgrades
2. **Educational Discounts:** 40% off for verified students
3. **Retargeting Ads:** Show ads to free users who visited pricing page
4. **Webinars:** "How to Study Effectively with AI" → upsell at end
5. **Lifetime Deal:** One-time $99 payment for lifetime premium

---

## Questions?

Run into issues? Check:
- Resend API logs: https://resend.com/logs
- Email deliverability: https://resend.com/monitoring
- Unsubscribe link: Resend handles this automatically with `{{unsubscribe_url}}`

Good luck! 🚀
