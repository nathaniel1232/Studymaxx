# ✅ Quick Setup Instructions

## 1. Fix Build Error
✅ **FIXED** - The build error in `/app/api/premium/check/route.ts` has been fixed.

## 2. Upgrade studymaxxer@gmail.com to Pro
Run this in **Supabase SQL Editor**:

```sql
-- Run: upgrade_studymaxxer.sql
UPDATE users 
SET 
  subscription_tier = 'pro',
  is_premium = true,
  billing_interval = 'yearly'
WHERE email = 'studymaxxer@gmail.com';

-- Verify:
SELECT id, email, subscription_tier, is_premium
FROM users 
WHERE email = 'studymaxxer@gmail.com';
```

**File created:** `upgrade_studymaxxer.sql`

## 3. Pricing Page
✅ **CREATED** - New pricing page at `/pricing`

**Features:**
- Beautiful 4-tier pricing cards (Free, Student, Pro, Team)
- Monthly/Yearly toggle with savings badges
- Feature comparison for each tier
- Direct Stripe checkout integration
- Responsive design

**Access:** `http://localhost:3000/pricing`

## 4. Homepage Updates
✅ **UPDATED** - Homepage now includes:

1. **Pricing Preview Section** (bottom of homepage)
   - Quick 4-card overview of all tiers
   - "POPULAR" badge on Pro tier
   - Direct links to full pricing page

2. **Footer Link**
   - "💎 Pricing" link added to footer
   - Prominent placement, first link

## What You Can Do Now

### Test Locally:
```powershell
npm run dev
```

Then visit:
- Homepage: `http://localhost:3000`
- Pricing: `http://localhost:3000/pricing`

### Next Steps:
1. **Run the SQL** to upgrade your account
2. **Test PDF upload** (should work with Pro tier)
3. **Test YouTube** (should work with Pro tier)
4. **Review pricing page** design and adjust prices if needed

## Files Changed/Created:
- ✅ `supabase_tiers_schema.sql` - Database schema
- ✅ `upgrade_studymaxxer.sql` - Upgrade your account
- ✅ `app/pricing/page.tsx` - New pricing page
- ✅ `app/page.tsx` - Added pricing section + footer link
- ✅ `app/api/premium/check/route.ts` - Fixed build error
- ✅ `app/api/youtube/transcript/route.ts` - YouTube API
- ✅ `app/utils/subscriptionTiers.ts` - Tier utilities
- ✅ `app/components/CreateFlowView.tsx` - Re-enabled PDF/YouTube

## Revenue Potential

**With 10,000 users:**
- Free: 9,700 users (97%)
- Student: 200 users @ $4.99 = $998/mo
- Pro: 50 users @ $9.99 = $500/mo
- Team: 50 users @ $29.99 = $1,500/mo
- **Total MRR: ~$3,000/month**

**With 50,000 users:**
- **Total MRR: ~$15,000/month**

---

**Everything is ready! Just run the SQL and test.** 🚀
