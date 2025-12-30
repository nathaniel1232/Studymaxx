# Premium Features Debug Guide

## Check if Premium is Working

1. **Open Browser Console** (F12)
2. **Run these commands one by one:**

```javascript
// Check if logged in
const { data: { session } } = await supabase.auth.getSession()
console.log('Logged in:', session ? 'YES' : 'NO')
console.log('User ID:', session?.user?.id)

// Check Premium status from API
const response = await fetch('/api/premium/check', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
const data = await response.json()
console.log('Premium Status:', data)
```

## Expected Output for Premium User

```javascript
{
  isPremium: true,
  setsCreated: X,
  canCreateMore: true,
  maxSets: -1  // -1 means unlimited
}
```

## If Premium Status Shows FALSE

Run this to manually activate:
```javascript
const { data: { session } } = await supabase.auth.getSession()
await fetch('/api/premium/manual-activate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: session.user.id })
})
console.log('Premium activated!')
```

Then refresh the page and try creating flashcards.

## Test Premium Features

1. **Unlimited Generations**: Try creating multiple flashcard sets (should not be blocked after 1)
2. **PDF Upload**: Click "Upload Material" → Select PDF (should not show "Premium Only")
3. **YouTube**: Click "From YouTube" (should not show "Premium Only")
