# ✅ Daily Flashcard Limit Setup Guide

## Problem
The 3-daily-flashcard-sets feature wasn't working because of a schema mismatch between what the code expected and what was in the database.

## Solution
Run the SQL migration, then the system will automatically:
- Limit free users to **3 study set generations per 24 hours**
- Reset the counter at **midnight UTC** every day
- Show "Daily limit reached" message when users hit the limit
- Allow premium users **unlimited** generations

---

## 🚀 Setup Instructions (5 minutes)

### Step 1: Run the Migration in Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project → **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `DAILY_LIMIT_FIX.sql` from this repo
5. Paste it into the SQL Editor
6. Click **Run**

**Expected Result:** "Queries executed successfully"

### Step 2: Verify the Setup
In the same SQL Editor, run:
```sql
SELECT id, email, daily_ai_count, last_ai_reset, is_premium FROM public.users LIMIT 5;
```

You should see columns: `daily_ai_count`, `last_ai_reset`

---

## 📊 How It Works

### User Experience Flow

**Free User (Not Premium):**
1. User tries to create a flashcard set
2. Backend checks: `SELECT daily_ai_count FROM users WHERE id = ?`
3. Counter is 0 → ✅ **Allowed** (set = 1/3)
4. User creates second set → ✅ **Allowed** (set = 2/3)
5. User creates third set → ✅ **Allowed** (set = 3/3)
6. User tries fourth set → ❌ **Blocked** with message:
   > "Free users can create 3 flashcard sets per day. Upgrade to Premium for unlimited AI generations!"
7. Next day at midnight UTC → Counter automatically resets to 0

**Premium User:**
- Can create unlimited sets (daily_ai_count has no limit)
- No "daily limit reached" messages

---

## 🔧 Technical Details

### Database Columns Added
```sql
daily_ai_count INTEGER DEFAULT 0        -- Today's count (0-3 for free users)
last_ai_reset TIMESTAMPTZ DEFAULT NOW() -- When the counter was last reset
```

### Reset Logic (in `/api/generate`)
```typescript
// Every request checks if it's a new day
if (shouldResetDailyCounter(userStatus.lastAiReset)) {
  UPDATE users SET daily_ai_count = 0, last_ai_reset = NOW()
}
```

### Limit Check (in `/api/generate`)
```typescript
if (userStatus.dailyAiCount >= 3 && !userStatus.isPremium) {
  return ERROR: "Daily limit reached"
}
```

---

## 📱 Frontend Display

The homepage now shows:
- **Free users**: "3 study sets left today" (when viewing home page)
- **Premium users**: "Unlimited study sets" ✨

---

## ✅ Testing Checklist

After running the SQL migration:

- [ ] Create a study set as free user → Works (1/3)
- [ ] Create another study set → Works (2/3)
- [ ] Create a third study set → Works (3/3)
- [ ] Try to create a 4th set → See "Daily limit reached" message ✅
- [ ] Wait for midnight UTC → Counter resets to 0
- [ ] Upgrade user to Premium → Can create unlimited sets
- [ ] Premium user doesn't see daily limit messages

---

## 🐛 Troubleshooting

### Problem: "Daily limit reached" appears but I haven't hit 3 yet
**Solution:** The schema wasn't set up correctly. Run the migration again.

### Problem: Counter doesn't reset at midnight
**Solution:** 
- Check your Supabase timezone (should be UTC)
- The reset happens UTC midnight, not your local timezone
- Wait until midnight UTC and try again

### Problem: Premium users still see daily limit
**Solution:** Make sure `is_premium = TRUE` in the database for that user
```sql
UPDATE public.users SET is_premium = TRUE WHERE id = 'user-id';
```

---

## 📞 Need Help?

If the 3-daily-limit still doesn't work after setup:
1. Check Supabase logs for errors
2. Verify the columns exist: Run the verification query from Step 2
3. Check the user's `is_premium` status in the database
4. Clear browser cache and try again

---

## 🎯 Summary

✅ **What's Fixed:**
- Daily counter now properly resets at midnight UTC
- Free users limited to 3 sets/day (not unlimited)
- Premium users can create unlimited sets
- Clear "daily limit reached" messaging

✅ **No Code Changes Needed:**
- The app code was already correct
- Only the database schema needed fixing
- Just run the SQL migration!

✅ **Live on Vercel:**
- Changes take effect immediately after migration
- No redeploy needed
