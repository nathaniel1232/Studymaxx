# Quick Test: Manually Activate Premium

Since your webhook isn't configured yet, use this to activate Premium for testing:

## Step 1: Open Browser Console
Press `F12` or right-click → Inspect → Console tab

## Step 2: Run This Code

```javascript
// Get your auth token
const supabase = window.supabase || (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')).createClient(
  'https://zvcawkxlhzhldhydxliv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Y2F3a3hsaHpobGRoeWR4bGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDIwMDAsImV4cCI6MjA4MjMxODAwMH0.Sjxu2lBasXvcH5Pfhi34uskE6P8KOd9F1_BoSTQ9sBI'
);

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  console.error('❌ You need to be logged in!');
} else {
  // Activate Premium
  const response = await fetch('/api/premium/manual-activate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  console.log('✅ Result:', result);
  
  if (result.success) {
    alert('Premium activated! Refreshing page...');
    window.location.reload();
  }
}
```

## Step 3: Refresh the Page

You should now see:
- ⭐ Premium badge in your profile
- "Premium" status in Settings
- Unlimited AI generations
- PDF/YouTube features unlocked

## Important

This is just for testing. For production, you MUST set up the webhook properly as described in URGENT_WEBHOOK_FIX.md

The webhook is what makes Premium persist across:
- Page refreshes
- Different devices
- Different browsers
- After subscription renewals/cancellations
