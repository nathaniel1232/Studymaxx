# 🚀 Quick Commands - Stripe CLI Setup

## Step 1: Install (PowerShell as Admin)

```powershell
winget install stripe.stripe-cli
```

Then **close and reopen PowerShell** (normal, not admin).

---

## Step 2: Login

```powershell
stripe login
```

Press Enter when prompted, click "Allow access" in browser.

---

## Step 3: Forward Webhooks

**Keep `npm run dev` running in Terminal 1.**

In **Terminal 2**, run:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Copy the webhook secret** that starts with `whsec_`

---

## Step 4: Update .env.local

Open `.env.local` and replace:

```env
STRIPE_WEBHOOK_SECRET=whsec_development_testing_only
```

With your actual secret:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

Save the file.

---

## Step 5: Restart Dev Server

In Terminal 1:

```bash
# Press Ctrl+C to stop, then:
npm run dev
```

---

## ✅ Done!

**Now you have:**
- Terminal 1: `npm run dev` running
- Terminal 2: `stripe listen --forward-to localhost:3000/api/stripe/webhook` running
- `.env.local` with real webhook secret

**Test payment with:** `4242 4242 4242 4242`

Premium will activate instantly! 🎉

---

## 🔄 Daily Workflow

Every time you develop:

```powershell
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Keep both running while testing payments.
