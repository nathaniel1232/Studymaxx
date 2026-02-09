# Domain & Webhook Setup Fix

## Problem
- Railway domain (studymaxx-production.up.railway.app) works ✅
- Custom domain (www.studymaxx.net) shows 404 "DEPLOYMENT_NOT_FOUND" ❌  
- Stripe webhook points to www.studymaxx.net but it's broken ❌

## Root Cause
Railway DNS is connected (green checkmark) but internal routing is broken. This happens when:
1. Domain was added/removed multiple times
2. CNAME records don't match Railway's expected format
3. Railway cache issue with domain mapping

---

## Fix #1: Reset Domain in Railway

### Step 1: Remove Current Domain
1. Open [Railway Dashboard](https://railway.app)
2. Click on **"Studymaxx"** project →  **"Studymaxx"** service (GitHub icon)
3. Click **"Settings"** tab
4. Scroll to **"Networking"** section
5. Find **"www.studymaxx.net"** → click **trash icon** (🗑️)
6. Confirm deletion

### Step 2: Wait
- **Wait 30 seconds** before proceeding (important for cache clear)

### Step 3: Add Domain Again
1. Still in **"Settings" → "Networking"**
2. Click **"+ Custom Domain"** button
3. Enter: **`www.studymaxx.net`**
4. Press **Enter**
5. Railway will show a **CNAME** you need to add (something like `cname-xxxxxxxx.railway.app`)
6. **Copy this CNAME value**

### Step 4: Update Cloudflare DNS
1. Open [Cloudflare Dashboard](https://cloudflare.com)  
2. Select **studymaxx.net** domain
3. Click **"DNS"** in left sidebar
4. Find the CNAME record for **"www"**
5. Click **"Edit"** on that record
6. Update **"Target"** to the CNAME from Railway (e.g., `cname-abc123.railway.app`)
7. **Proxy status**: Set to **"DNS only"** (gray cloud, not orange)
8. Click **"Save"**

### Step 5: Wait for DNS Propagation
- **Wait 2-5 minutes** for DNS to propagate
- Railway will show a green checkmark when ready

### Step 6: Test
- Open **https://www.studymaxx.net** in browser
- Should now load correctly ✅

---

## Fix #2: Alternative — Remove www, Use Root Domain

If you keep having issues with www, use the root domain instead:

### Step 1: Remove www from Railway
(Follow "Remove Current Domain" steps above)

### Step 2: Add Root Domain
1. In Railway **"Settings" → "Networking"**
2. Click **"+ Custom Domain"**
3. Enter: **`studymaxx.net`** (no www)
4. Copy the CNAME Railway provides

### Step 3: Update Cloudflare DNS
1. In Cloudflare DNS, delete any **A records** for **"@"** (root)
2. Delete the **CNAME** for **"www"**
3. Add new **CNAME** record:
   - **Type**: CNAME
   - **Name**: `@` (or leave blank for root)
   - **Target**: (the CNAME from Railway)
   - **Proxy status**: DNS only (gray cloud)
   - **TTL**: Auto
4. Save

### Step 4: Add www Redirect (Optional)
To redirect www → root domain:
1. In Cloudflare, go to **"Rules" → "Page Rules"**
2. Create rule:
   - **URL**: `www.studymaxx.net/*`
   - **Setting**: Forwarding URL (301 Permanent Redirect)
   - **Destination**: `https://studymaxx.net/$1`
3. Save

---

## Fix #3: Update Stripe Webhook URL

**CRITICAL**: After your domain works, update the Stripe webhook:

1. Open [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **"Developers" → "Webhooks"**
3. Find your webhook (currently points to www.studymaxx.net)
4. Click **"..."** → **"Update details"**
5. Change **"Endpoint URL"** to your working domain:
   - If www works: `https://www.studymaxx.net/api/stripe/webhook`
   - If using root: `https://studymaxx.net/api/stripe/webhook`
6. Click **"Update endpoint"**

### Test Stripe Webhook
1. In Stripe webhook page, click **"Send test webhook"**
2. Select event type: **`checkout.session.completed`**
3. Click **"Send test webhook"**
4. Check **"Recent deliveries"** — should show **200 OK** ✅

---

## Debugging Commands

### Check DNS Resolution
```powershell
nslookup www.studymaxx.net
```
Should return Railway's IP address.

### Check CNAME
```powershell
nslookup -type=CNAME www.studymaxx.net
```
Should show the Railway CNAME.

### Test HTTPS
```powershell
curl -I https://www.studymaxx.net
```
Look for `HTTP/2 200` status (not 404).

---

## Expected Results

✅ **When Working:**
- www.studymaxx.net loads the StudyMaxx app
- Railway shows green checkmark
- Stripe webhook receives events successfully (200 OK)
- Premium purchases activate immediately

❌ **If Still Broken:**
1. Check Cloudflare DNS — ensure **DNS only** (gray cloud), not proxied
2. Check Railway logs: `Deployments` → `View logs` → look for errors
3. Ensure Railway service is **deployed** and **active** (not sleeping)
4. Try accessing Railway domain directly to confirm app is running

---

## Contact Support

If issues persist after following all steps:
- Railway: [help.railway.app](https://help.railway.app)
- Cloudflare: Community forum or support ticket
- Check Railway Discord for real-time help

---

**Last Updated**: February 9, 2026
