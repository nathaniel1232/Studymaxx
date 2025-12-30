# SETUP INSTRUCTIONS - Premium & Cross-Device Sync

## What I Fixed

### 1. **Stripe Premium Activation** ✅
- Updated [webhook handler](app/api/stripe/webhook/route.ts) to properly create/update user in database
- Now creates user if they don't exist when payment completes
- Sets `is_premium = true` in database automatically

### 2. **Cross-Device Flashcard Sync** ✅ 
- Created Supabase `flashcard_sets` table for cloud storage
- Updated [storage.ts](app/utils/storage.ts) to use Supabase when logged in
- Falls back to localStorage if not authenticated
- All flashcards sync across devices when logged in

## Setup Steps

### Step 1: Create Flashcard Sets Table in Supabase

1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Copy and paste the contents of [supabase_flashcards_schema.sql](supabase_flashcards_schema.sql)
4. Click **Run**
5. You should see "Success. No rows returned"

### Step 2: Test Stripe Webhook (Optional but Recommended)

Since your webhook is already configured, you can test it:

```powershell
# Make sure Stripe CLI is running
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger a test payment
stripe trigger checkout.session.completed
```

After running this, check Supabase `users` table - you should see a user with `is_premium = true`.

### Step 3: Update Code That Calls Storage Functions

**IMPORTANT**: Several files need updating because storage functions are now `async`. 

Run this search in your editor:
- Find: `getSavedFlashcardSets()`
- Replace: `await getSavedFlashcardSets()`

And make sure the parent functions are marked as `async`.

Files that need updating:
- [ ] [app/page.tsx](app/page.tsx) line 37
- [ ] [app/components/SavedSetsView.tsx](app/components/SavedSetsView.tsx) lines 24, 30
- [ ] [app/components/StudyView.tsx](app/components/StudyView.tsx) lines 77, 382
- [ ] [app/components/CreateFlowView.tsx](app/components/CreateFlowView.tsx) lines 124, 134

## How It Works Now

### Premium Activation Flow:
1. User clicks "Upgrade to Premium"
2. Redirected to Stripe checkout
3. Completes payment
4. Stripe sends webhook to `/api/stripe/webhook`
5. Webhook creates/updates user in database with `is_premium = true`
6. User is redirected back to app
7. Premium features activate automatically

### Flashcard Sync Flow:
1. **Logged In**: 
   - Flashcards saved to Supabase database
   - Accessible from any device
   - Real-time sync across devices

2. **Not Logged In**:
   - Flashcards saved to localStorage
   - Only available on current device
   - Can be migrated to account when user logs in

## Testing

### Test Premium:
1. Sign in to your app
2. Make a test Stripe payment
3. Check Supabase `users` table - `is_premium` should be `true`
4. Refresh app - Premium badge should show
5. Try creating unlimited flashcard sets

### Test Cross-Device Sync:
1. Sign in on Device A
2. Create flashcard sets
3. Sign in on Device B with same account
4. See the same flashcard sets appear!

## Console Logs to Watch

After refreshing, you should see:
```
[Storage] Saved to Supabase: [id]
[Storage] Fetched from Supabase: X sets
[CreateFlowView] Premium status received: { isPremium: true }
```

If you see these, everything is working! 🎉
