# Complete Setup Guide: Stripe Coupon + Email Campaign

## Your Pricing
- **Current Price:** $8.99/month
- **Campaign Price:** $4.49/month (50% off first month)
- **Coupon Code:** SAVE50

---

## Option A: Best Way - Create Coupon in Stripe (Easiest)

### Step 1: Create 50% OFF Coupon in Stripe

1. Go to: https://dashboard.stripe.com/coupons
2. Click **"Create coupon"**
3. Fill in exactly:
   - **Coupon code:** `SAVE50`
   - **Discount type:** Percentage
   - **Percentage off:** `50`
   - **Duration:** Select **"Once"** (applies only to first billing cycle)
   - **Max redemptions:** Leave blank (unlimited)
   - Click **"Create coupon"**

✅ Done! This coupon will appear automatically at checkout and give 50% off only the first month.

### Step 2: How It Works for Your Customers

When they click "Upgrade to Premium Now" in the email:
1. They're taken to your Stripe pricing page
2. At checkout, they see: **$8.99 → $4.49** (first month)
3. They pay $4.49 for month 1
4. Month 2 onward: $8.99/month automatically

---

## Option B: Alternative - Promotion Code (Auto-Applies)

If you want it to auto-apply without them selecting it:

1. Go to: https://dashboard.stripe.com/promotions
2. Click **"Create"** → **"Promotion Code"**
3. Fill in:
   - **Coupon:** Select the SAVE50 coupon you created above
   - **Code:** `SAVE50`
   - **Active:** Toggle ON
4. Click **"Create promotion code"**

Then update the email link:
```html
<!-- Instead of just the domain, include the promo code parameter: -->
https://studymaxx.net/upgrade?promo_code=save50
```

---

## Getting Your User Email List from Supabase

### Step 1: Query Free Users

1. Go to: https://app.supabase.com/projects
2. Select your StudyMaxx project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**
5. Paste this:

```sql
SELECT email FROM users
WHERE is_premium = false
  AND email IS NOT NULL
  AND email != ''
  AND created_at >= NOW() - INTERVAL '90 days'
ORDER BY updated_at DESC;
```

**Why this query:**
- `is_premium = false` → Free users only
- `email IS NOT NULL AND email != ''` → Valid emails
- `created_at >= NOW() - INTERVAL '90 days'` → Active in last 3 months (higher conversion)
- `ORDER BY updated_at DESC` → Most recent activity first

6. Click **"Run"** (bottom right)
7. You'll see a table with email addresses

### Step 2: Export as CSV

1. At the top right of results, click **"Download"**
2. Choose **"CSV"**
3. Save the file (e.g., `users.csv`)

---

## Using the Exported User List

### Option 1: Auto-Convert CSV to JavaScript (Easiest)

```bash
# If you have the CSV file, convert it to JavaScript:
node -e "
const fs = require('fs');
const csv = fs.readFileSync('users.csv', 'utf8');
const users = csv.split('\n')
  .filter(line => line.trim() && !line.includes('email'))
  .map(line => ({ email: line.trim() }));
console.log('const users = ' + JSON.stringify(users, null, 2) + ';');
" > user-list.js

# Then copy the output and paste into send-premium-campaign.js
```

### Option 2: Manual Copy-Paste (5 min)

1. Open your CSV file in Excel or Google Sheets
2. Copy all emails
3. Open `send-premium-campaign.js`
4. Find this section around line 13:

```javascript
// Sample user list - Replace with your actual users from Supabase
const users = [
  // { email: 'user1@example.com' },
  // { email: 'user2@example.com' },
  // Add your users here
];
```

5. Replace with:

```javascript
const users = [
  { email: 'user1@studymaxx.no' },
  { email: 'user2@studymaxx.no' },
  { email: 'user3@studymaxx.no' },
  // ... paste all your emails
];
```

---

## Send Test Email (DO THIS FIRST!)

### Before sending to 1,450+ users, test with yourself:

1. Update `send-premium-campaign.js`:

```javascript
const users = [
  { email: 'your-email@gmail.com' }  // Your own email!
];
```

2. Set your Resend API key:

```bash
# Windows PowerShell:
$env:RESEND_API_KEY = "re_xxxxxxxxxxxxx"
node send-premium-campaign.js

# Mac/Linux bash:
export RESEND_API_KEY="re_xxxxxxxxxxxxx"
node send-premium-campaign.js
```

3. Check your inbox (check spam folder too!)

4. Click **"Upgrade to Premium Now"**

5. Verify you see:
   - Regular price: **$8.99/month**
   - Discount price: **$4.49/month** (for first month)
   - Text says: **"$4.49/month first month"**

6. Don't actually subscribe (or cancel after testing)

### Expected Results from Test:
✅ Email arrives in 5-10 seconds
✅ Looks good on mobile and desktop
✅ Link works
✅ Pricing is correct

---

## Send Real Campaign

### Once test is successful:

1. **Add ALL users to the array** in `send-premium-campaign.js`

2. **Verify count:**
```bash
node -e "
const users = []; // Your full list
console.log('Total emails:', users.length);
"
```

3. **Send the campaign:**
```bash
# Windows:
$env:RESEND_API_KEY = "re_xxxxxxxxxxxxx"
node send-premium-campaign.js

# Mac/Linux:
export RESEND_API_KEY="re_xxxxxxxxxxxxx"
node send-premium-campaign.js
```

4. **Watch the output** - You'll see:
```
✓ Sent to user1@example.com - ID: 123abc
✓ Sent to user2@example.com - ID: 456def
...
📊 Campaign Summary:
Total Sent: 1,450
Total Failed: 2
Success Rate: 99.9%
```

---

## Monitor Results

### 1. In Resend Dashboard
- Go to: https://resend.com/emails
- See: Open rates, click rates, bounce rate
- Goal: 20-30% open rate

### 2. In Stripe Dashboard
- Go to: https://dashboard.stripe.com/customers
- Filter by "Created date" last 24 hours
- You'll see new customers from the campaign
- Look for customers who paid $4.49 first charge

### 3. Track Conversions
- Expected: 5-10 new premium users from 1,450 emails
- Expected revenue: $20-40 first month

---

## Help! My Email Didn't Arrive

### Check these in order:

1. **Resend API Key Correct?**
   ```bash
   # Test your API key is valid:
   curl -X GET https://api.resend.com/audiences -H "Authorization: Bearer re_xxxxx"
   # Should return JSON, not error
   ```

2. **Email Address Valid?**
   - No typos in email addresses
   - No spaces or special characters
   - Verify format: `user@example.com`

3. **From Address Verified?**
   - Go to https://resend.com/domains
   - Make sure studymaxx.net is verified
   - Check green checkmark next to domain

4. **Check Resend Logs**
   - Go to https://resend.com/logs
   - See delivery status for each email
   - Red = bounced (invalid email)
   - Green = delivered

5. **Check Email Spam**
   - Gmail: Check "Promotions" or "All Mail" tabs
   - Outlook: Check "Junk" folder
   - Reply with feedback helps Gmail learn

---

## Expected Success Metrics

| Metric | Expected | Your Target |
|--------|----------|-------------|
| **Send Rate** | 99.5%+ | > 1,440 of 1,450 |
| **Delivery Rate** | 98%+ | > 1,410 emails |
| **Open Rate** | 20-30% | 280-435 opens |
| **Click Rate** | 3-5% | 42-87 clicks |
| **Conversion Rate** | 5-10% of clicks | 2-8 new premium users |
| **Revenue from Campaign** | $10-32 first month | - |

---

## Pro Tips

✅ **Do:**
- Send on Tuesday/Wednesday 10 AM-2 PM (highest opens)
- Test with yourself first
- Monitor Resend dashboard in real-time
- Follow up with non-openers after 7 days

❌ **Don't:**
- Send Saturday/Sunday (low open rates)
- Send twice in one day (spam reports go up)
- Remove unsubscribers manually (Resend handles it)
- Use ALL CAPS everywhere (spam filter trigger)

---

## Questions?

1. **Email not applying coupon?**
   → Make sure SAVE50 coupon exists in Stripe
   → Clear browser cache when testing
   → Use incognito/private window

2. **Getting errors when sending?**
   → Check RESEND_API_KEY is correct
   → Verify emails are in correct format
   → Check Resend logs for specific error

3. **Not getting enough signups?**
   → Increase offer (75% off or 2 months free)
   → Improve email subject line
   → Add retargeting email after 3 days to non-openers

---

**You're ready! 🚀 Good luck with your campaign!**
