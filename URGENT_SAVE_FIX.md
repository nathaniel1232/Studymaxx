# URGENT: Save Functionality Fix - Deployed

## Issue
Users were getting "saving_failed" error when trying to save flashcards.

## Root Cause
The `/api/flashcard-sets` POST endpoint was trying to insert `folder_id` column, but:
1. The initial flashcard_sets schema doesn't include folder_id
2. Even though supabase_folders_schema.sql tries to add it conditionally, it may not have been executed on all databases
3. Sending `folder_id: null` was causing database errors on tables without the column

## Fix Applied

### 1. Added Detailed Error Logging
- **File**: `app/utils/storage.ts`
- Added console.log statements to trace the exact error from Supabase
- Shows API response status and error details
- Helps users see what went wrong (not just generic "failed to save")

### 2. Added Error Details to User UI
- **File**: `app/components/StudyView.tsx`
- Changed from generic `t("save_failed")` message to actual error message
- Shows users: `Failed to save: [actual error from API]`
- This helps debug any remaining issues

### 3. Fixed folder_id Insertion Bug
- **File**: `app/api/flashcard-sets/route.ts`
- Modified POST endpoint to EXCLUDE `folder_id` from insert if not provided
- Now builds insertData dynamically, only including folder_id if it has a value
- Prevents "unknown column" errors on databases that haven't been migrated

## Testing Steps

1. **Generate some flashcards** - Create 10-30 flashcards through any input method
2. **Click Save** - Save the generated set with a name
3. **Check browser console** - Should see detailed logs:
   - `[Storage] Attempting to save: ...`
   - `[API] POST /flashcard-sets - Saving flashcard set...`
   - `[Storage] ✅ Saved to Supabase successfully: ...` (if logged in)
4. **Verify success** - Should see "set saved successfully" message
5. **Check saved sets** - Go to "Saved Sets" view and verify the set appears

## What Changed

### Before
```javascript
// Would send folder_id: null even if not provided
body: JSON.stringify({ 
  user_id, name, cards, 
  subject: null, grade: null,
  folder_id: null  // ❌ Causes error if column doesn't exist
})
```

### After
```javascript
// Only sends folder_id if it has a value
const insertData = {
  user_id, name, cards,
  subject: null, grade: null
  // ✅ folder_id only included if folderId provided
};
if (folderId) {
  insertData.folder_id = folderId;
}
```

## Deployment Status
- ✅ Committed to GitHub
- ✅ Pushed to main branch
- 🔄 Deploying to Vercel (check deployment status)

## Next Steps if Still Failing
1. Check browser console for specific error message
2. Check Vercel deployment logs for backend errors
3. If error is "column folder_id does not exist" → Run database migration:
   ```sql
   ALTER TABLE flashcard_sets ADD COLUMN folder_id UUID;
   ALTER TABLE flashcard_sets 
   ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
   CREATE INDEX idx_flashcard_sets_folder_id ON flashcard_sets(folder_id);
   ```

## Files Modified
1. `app/utils/storage.ts` - Added detailed error logging
2. `app/components/StudyView.tsx` - Show actual error message to user
3. `app/api/flashcard-sets/route.ts` - Exclude folder_id from insert if not provided
