# 🧪 Testing Checklist

## Before Testing
- [ ] Run `npm run dev` in terminal
- [ ] Run `supabase_tiers_schema.sql` in Supabase SQL Editor
- [ ] Run `upgrade_studymaxxer.sql` to upgrade your account

## Test 1: Build Runs Without Errors
```powershell
npm run build
```
✅ Should complete without parsing errors

## Test 2: Pricing Page Loads
1. Go to `http://localhost:3000/pricing`
2. Check all 4 tiers display correctly
3. Toggle Monthly/Yearly billing
4. Verify savings badges show on yearly
5. Click "Choose Pro" button (will redirect to Stripe or show error - expected for now)

## Test 3: Homepage Pricing Section
1. Go to `http://localhost:3000`
2. Scroll to bottom
3. Verify 4 pricing cards show before footer
4. Verify "Pro" has "POPULAR" badge
5. Click any "Choose [Tier]" button → should go to `/pricing`

## Test 4: Footer Link
1. On homepage, scroll to footer
2. Verify "💎 Pricing" is first link
3. Click it → should go to `/pricing`
4. Click "← Back to App" → returns to homepage

## Test 5: Premium Account Works
After running `upgrade_studymaxxer.sql`:

1. Sign in with studymaxxer@gmail.com
2. Go to Create Flow
3. **PDF Upload:**
   - Click "PDF Document" card
   - Should NOT show 🔒 badge
   - Should be able to select PDF
   - Try uploading a text-based PDF
   - Text should extract

4. **YouTube:**
   - Click "YouTube Video" card
   - Should NOT show 🔒 badge
   - Paste: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Click "Extract Transcript"
   - Should see transcript text

5. **Verify Tier:**
   - Open browser console (F12)
   - Look for: `User tier: pro`
   - Should see `isPremium: true`

## Test 6: Free User Experience
Sign out and create a new account:

1. Go to Create Flow
2. Click "PDF Document" → Should show "🔒 Student+" badge
3. Click it → Premium modal appears
4. Click "YouTube Video" → Should show "🔒 Pro" badge
5. Click it → Premium modal appears

## Common Issues

### PDF not extracting?
- PDF might be image-based (scanned)
- Try a different PDF with real text
- Check console for errors

### YouTube failing?
- Video must have captions/subtitles
- Try: `https://www.youtube.com/watch?v=jNQXAC9IVRw` (has captions)
- Check Network tab for API errors

### Tier not updating?
```sql
-- Force check in Supabase:
SELECT id, email, subscription_tier, is_premium 
FROM users 
WHERE email = 'studymaxxer@gmail.com';

-- If wrong, update again:
UPDATE users 
SET subscription_tier = 'pro', is_premium = true
WHERE email = 'studymaxxer@gmail.com';
```

### Build errors?
```powershell
# Clear cache and rebuild
rm -r .next
npm run build
```

## Expected Results Summary

✅ Build completes without errors
✅ Pricing page is beautiful and responsive
✅ Homepage shows pricing preview at bottom
✅ Footer has Pricing link
✅ Pro users can upload PDF
✅ Pro users can use YouTube
✅ Free users see locked badges
✅ Clicking locked features shows upgrade modal

---

**If all tests pass, you're ready to deploy!** 🚀
