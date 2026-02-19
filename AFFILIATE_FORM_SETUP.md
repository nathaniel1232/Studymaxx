# Affiliate Form Setup Guide

## Step 1: Create the Supabase Table

Go to your Supabase dashboard and run the SQL from `AFFILIATE_TABLE_SETUP.sql` in the SQL editor.

The table will have these columns:
- `id` - UUID (auto-generated)
- `full_name` - Text
- `email` - Text  
- `tiktok_handle` - Text
- `message` - Text (optional)
- `status` - Text (pending/approved/rejected)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Step 2: Test the Form

1. Go to `/affiliate` page
2. Fill out the form with test data
3. Click "Submit Application"
4. You should see a success message
5. Check the browser console (F12) to see detailed logs

## Step 3: View Submissions in Supabase

1. Go to Supabase Dashboard
2. Click "Table Editor" on the left sidebar
3. Select `affiliate_applications` table
4. You should see all submitted applications with a green checkmark confirmation

## Troubleshooting

### Submissions not appearing in table?
1. Check browser console for errors (F12 > Console)
2. Check network tab to see if POST request succeeded
3. Verify SUPABASE_SERVICE_ROLE_KEY is set in `.env.local`
4. Check that the table was created with the correct schema

### RLS (Row Level Security) Issues?
The SQL script sets up RLS to:
- Allow anyone to INSERT applications (no auth needed)
- Allow authenticated admins to view/update applications

### Want to see with your own eyes?
Use curl to test the endpoint:
```bash
curl -X POST http://localhost:3000/api/affiliate \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "tiktokHandle": "@testhandle",
    "message": "Test message"
  }'
```

## What Happens When Form is Submitted

1. Form data is sent to `/api/affiliate` endpoint
2. Backend validates required fields
3. Data is inserted into `affiliate_applications` table in Supabase
4. (Optional) Email notification sent to studymaxxer@gmail.com via Resend
5. Success message shown to user
6. User redirected to homepage after 3 seconds

## Monitoring Submissions

In Supabase Table Editor, you can:
- View all applications
- Filter by status (pending/approved/rejected)
- Update status manually
- Delete test entries
- Sort by date

## API Endpoint Details

- **URL:** `/api/affiliate`
- **Method:** POST
- **Auth:** No authentication required (uses service role key)
- **Content-Type:** application/json

**Request body:**
```json
{
  "fullName": "string",
  "email": "string",
  "tiktokHandle": "string",
  "message": "string (optional)"
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Application received",
  "data": [
    {
      "id": "uuid",
      "full_name": "string",
      "email": "string",
      "tiktok_handle": "string",
      "message": "string",
      "status": "pending",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

**Error response (400/500):**
```json
{
  "error": "Error message",
  "details": "More specific error details"
}
```
