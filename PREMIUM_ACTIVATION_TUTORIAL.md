# 🎓 Complete Tutorial: Fix Premium Activation in StudyMaxx

## 📋 What You'll Learn
- Why Premium isn't activating after payment
- How to set up Stripe webhooks for local development
- How to test Premium payments end-to-end
- How to deploy with working webhooks in production

**Time needed:** 10-15 minutes  
**Difficulty:** Beginner-friendly

---

## 🔍 Understanding The Problem

### What's Happening Right Now:
```
User clicks "Upgrade to Premium" ✅
↓
User pays with test card ✅
↓
Payment shows in Stripe Dashboard ✅
↓
Stripe tries to tell your app "payment succeeded" ❌ (FAILS HERE)
↓
Your database never updates ❌
↓
User still shows as Free ❌
```

### Why It Fails:
Your `.env.local` file has:
```
STRIPE_WEBHOOK_SECRET=whsec_development_testing_only
```

This is a **fake secret**. When Stripe tries to send the webhook, your server rejects it because the signature doesn't match.

---

## 🛠️ Solution: Set Up Stripe CLI (Local Development)

### Step 1: Install Stripe CLI

**Windows (PowerShell as Administrator):**
```powershell
# Using Winget (Windows 10/11)
winget install stripe.stripe-cli

# Or using Scoop
scoop install stripe

# Or download directly from:
# https://github.com/stripe/stripe-cli/releases/latest
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download and extract
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### Step 2: Login to Stripe

Open a **new terminal/PowerShell** and run:

```bash
stripe login
```

**What happens:**
1. A browser window will open
2. Click "Allow access"
3. Terminal shows: ✅ "Done! The Stripe CLI is configured..."

### Step 3: Forward Webhooks to Your Local Server

**Important:** Keep your dev server running (`npm run dev`) in one terminal.

Open a **second terminal** and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**You'll see output like:**
```
> Ready! You are using Stripe API Version [2025-12-15]. 
> Your webhook signing secret is whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
> [timestamp] --> customer.created
> [timestamp] --> charge.succeeded
```

**Copy that secret!** It looks like: `whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Step 4: Update Your .env.local File

1. Open `.env.local` in VS Code
2. Find this line:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_development_testing_only
   ```
3. Replace with your real secret:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
4. **Save the file**

### Step 5: Restart Your Dev Server

1. Go to the terminal running `npm run dev`
2. Press `Ctrl+C` to stop it
3. Run `npm run dev` again

---

## 🧪 Testing Premium Activation

### Test Payment Flow:

1. **Make sure both terminals are running:**
   - Terminal 1: `npm run dev` (your app)
   - Terminal 2: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

2. **Open your app:** `http://localhost:3000`

3. **Sign in** (if not already)

4. **Click "Upgrade to Premium"**

5. **Use Stripe test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

6. **Click "Subscribe"**

### What You Should See:

**In the Stripe CLI terminal:**
```
[timestamp] --> checkout.session.completed [evt_xxx]
[timestamp] <-- [200] POST http://localhost:3000/api/stripe/webhook
```

**In your dev server terminal:**
```
✅ Checkout completed for user: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
✅ User a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6 is now Premium
```

**In your browser:**
- Redirect back to your app
- **Refresh the page** (F5)
- See ⭐ Premium badge in your profile
- Settings shows "Premium" status
- You can now create unlimited flashcards!

---

## 🐛 Troubleshooting

### Problem: "No webhook signing secret found"

**Solution:** Make sure `.env.local` has the correct secret and you restarted the dev server.

### Problem: "Webhook signature verification failed"

**Solution:** 
- Make sure the Stripe CLI is still running
- Copy the exact secret from Stripe CLI output
- No extra spaces or quotes in `.env.local`

### Problem: "User still shows Free after payment"

**Check these:**

1. **Stripe CLI running?**
   ```bash
   # Should see "Ready!" message
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. **Webhook received?**
   - Look for `checkout.session.completed` in Stripe CLI terminal
   - Should show `[200]` response

3. **Database updated?**
   Open browser console (F12) and run:
   ```javascript
   const { data } = await supabase.from('users').select('is_premium').eq('id', user.id).single();
   console.log('Premium status:', data.is_premium);
   ```

4. **Still not working?**
   Use manual activation temporarily:
   - Open browser console (F12)
   - Paste this code:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   const response = await fetch('/api/premium/manual-activate', {
     method: 'POST',
     headers: { 
       'Authorization': `Bearer ${session.access_token}`,
       'Content-Type': 'application/json'
     }
   });
   console.log(await response.json());
   location.reload();
   ```

---

## 🚀 Production Deployment

When you deploy to Vercel/Netlify/etc., follow these steps:

### Step 1: Create Production Webhook Endpoint

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/test/webhooks (for test mode)
   - https://dashboard.stripe.com/webhooks (for live mode)

2. **Click "Add endpoint"**

3. **Enter your production URL:**
   ```
   https://your-app-name.vercel.app/api/stripe/webhook
   ```

4. **Select events to listen to:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.updated`
   - ✅ `invoice.payment_failed`

5. **Click "Add endpoint"**

### Step 2: Copy Signing Secret

After creating the endpoint, click on it and you'll see:

```
Signing secret
whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx [Reveal]
```

Click **"Reveal"** and copy the secret.

### Step 3: Add to Production Environment Variables

**In Vercel:**
1. Go to your project settings
2. Click "Environment Variables"
3. Add:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Environment: ✅ Production ✅ Preview ✅ Development
4. Click "Save"
5. **Redeploy your app**

**In Netlify:**
1. Site settings → Environment variables
2. Add `STRIPE_WEBHOOK_SECRET`
3. Redeploy

### Step 4: Test Production

1. Make a test payment in production
2. Check Stripe Dashboard → Webhooks → [your endpoint]
3. Should see successful events (green checkmarks)
4. User should get Premium instantly

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Stripe CLI installed and logged in
- [ ] `stripe listen` running in terminal
- [ ] `.env.local` has correct `STRIPE_WEBHOOK_SECRET`
- [ ] Dev server restarted after updating `.env.local`
- [ ] Test payment with `4242 4242 4242 4242` succeeds
- [ ] Stripe CLI shows `checkout.session.completed` event
- [ ] Dev server logs show "User is now Premium"
- [ ] Profile shows ⭐ Premium badge after refresh
- [ ] Settings page shows "Premium" status
- [ ] Can create more than 1 flashcard set

---

## 📚 Additional Resources

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Stripe Webhooks Guide:** https://stripe.com/docs/webhooks
- **Test Cards:** https://stripe.com/docs/testing

---

## 🆘 Still Having Issues?

If Premium still doesn't activate after following this tutorial:

1. **Check your terminal logs** for error messages
2. **Check Stripe Dashboard** → Webhooks → Events for failed webhooks
3. **Use manual activation** (see Troubleshooting section above)
4. **Verify your database** has the `is_premium` column:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users';
   ```

The code is working perfectly - it's just a configuration issue! Once the webhook secret is correct, everything will work. 🎉
