# Problem Reports & Updates System

## Features Added

### 1. **Report a Problem** Button
- Located in Settings → Contact Us section
- Users can submit bug reports, feature requests, and feedback
- Optional email field (or submit anonymously)
- Problem types: Bug, Feature Request, Content Quality, Performance, Other
- Stored in Supabase `problem_reports` table

### 2. **What's New / Update Log**
- Located in Settings (new section above Contact Us)
- Shows version history with dates and changes
- Easy to read timeline format
- Updates defined in `app/components/UpdatesModal.tsx`

## Setup

### Database Setup
Run this command to create the problem_reports table:

```bash
node setup-problem-reports.js
```

Or manually run the SQL in Supabase SQL Editor:
- File: `supabase_problem_reports_schema.sql`

## Viewing Problem Reports

### Option 1: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Table Editor → problem_reports
4. View all submitted reports

### Option 2: SQL Query
```sql
SELECT 
  id,
  email,
  problem_type,
  description,
  created_at,
  status
FROM problem_reports
ORDER BY created_at DESC;
```

### Option 3: Export to CSV
In Supabase Table Editor:
1. Select problem_reports table
2. Click "..." menu
3. Choose "Download as CSV"

## Report Status Management

Update report status in Supabase:
```sql
UPDATE problem_reports
SET status = 'resolved'
WHERE id = 'report-id-here';
```

Status values: `new`, `in-progress`, `resolved`, `closed`

## Adding New Updates

Edit `app/components/UpdatesModal.tsx`:

```typescript
const updates: UpdateEntry[] = [
  {
    version: "1.3.0",
    date: "January 8, 2026",
    changes: [
      "🎯 Your new feature description",
      "🐛 Bug fix description",
      // Add more changes...
    ]
  },
  // ... existing updates
];
```

**Guidelines:**
- Use emojis for visual appeal
- Keep descriptions short and positive
- Focus on user-facing improvements
- Avoid technical jargon
- No negative information or secret details

## Files Created

1. `app/components/ReportProblemModal.tsx` - Problem report form
2. `app/components/UpdatesModal.tsx` - Update log viewer
3. `app/api/report-problem/route.ts` - API endpoint for reports
4. `supabase_problem_reports_schema.sql` - Database schema
5. `setup-problem-reports.js` - Setup script
6. Updated `app/components/SettingsView.tsx` - Added buttons and modals

## Testing

1. Start dev server: `npm run dev`
2. Go to Settings
3. Click "View Update Log" to see changelog
4. Click "Report a Problem" to submit a test report
5. Check Supabase dashboard to verify report was stored
