# 🔧 STRIPE WEBHOOK FIX - KOMPLETT GUIDE

## PROBLEM:
Webhook får 200 OK i Stripe, men `stripe_customer_id` og `stripe_subscription_id` lagres ikke i Supabase.

---

## 🚨 LØSNING 1: SYNC EKSISTERENDE SUBSCRIPTIONS (RASKEST)

### Kjør Sync-Script Lokalt:

```bash
# 1. Installer dependencies (hvis ikke allerede gjort)
npm install stripe @supabase/supabase-js dotenv

# 2. Kjør sync-scriptet
node sync-stripe-to-supabase.js
```

**Dette scriptet vil:**
- ✅ Hente ALLE kunder fra Stripe
- ✅ Finne deres aktive subscriptions
- ✅ Matche mot Supabase brukere (via email)
- ✅ Oppdatere `stripe_customer_id` og `stripe_subscription_id`
- ✅ Sette `is_premium = true` og `premium_expires_at`

**Forventet output:**
```
✅ Successfully synced: 5
ℹ️  Already had Stripe IDs: 2
❌ Errors: 0
📧 Total customers processed: 7
```

### Etter Sync:
1. **Be alle brukere logge ut/inn**
2. Premium skal nå virke for alle
3. "Manage Subscription" button skal vises

---

## 🔍 LØSNING 2: DEBUG WEBHOOK (hvis sync ikke fikser det)

### Sjekk Webhook Logs i Stripe:

1. Gå til **Stripe Dashboard** → **Developers** → **Webhooks**
2. Klikk på webhook URL
3. Klikk på en recent event (f.eks `checkout.session.completed`)
4. Se "Request body" og "Response"

### Sjekk om `metadata.userId` er satt:

I Stripe event body, se etter:
```json
{
  "data": {
    "object": {
      "metadata": {
        "userId": "xxx-xxx-xxx"  ← MÅ finnes!
      },
      "client_reference_id": "xxx-xxx-xxx"  ← Backup hvis metadata mangler
    }
  }
}
```

**Hvis `userId` mangler:**
- Webhook kan ikke identifisere brukeren
- Ingen data lagres i Supabase
- FIX: Sjekk at checkout-koden setter `metadata.userId`

---

## 🛠️ LØSNING 3: MANUELL STRIPE → SUPABASE KOBLING

### For nathanielfisk54@gmail.com (og andre):

1. **Finn Stripe Customer ID:**
   - Gå til Stripe Dashboard → Customers
   - Søk på `nathanielfisk54@gmail.com`
   - Noter `cus_XXXXXXXXXXXXX`

2. **Finn Subscription ID:**
   - Klikk på customer
   - Se active subscriptions
   - Noter `sub_XXXXXXXXXXXXX`

3. **Kjør i Supabase SQL Editor:**

```sql
-- Finn brukerens ID først
SELECT id, email FROM users WHERE email = 'nathanielfisk54@gmail.com';

-- Bruk ID fra over og oppdater med Stripe data
UPDATE users
SET 
  is_premium = true,
  stripe_customer_id = 'cus_XXXXXXXXXXXXX',  -- Fra Stripe
  stripe_subscription_id = 'sub_XXXXXXXXXXXXX',  -- Fra Stripe
  premium_expires_at = NOW() + INTERVAL '30 days',
  subscription_tier = 'premium'
WHERE email = 'nathanielfisk54@gmail.com';

-- Verifiser
SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at
FROM users 
WHERE email = 'nathanielfisk54@gmail.com';
```

4. **Test:**
   - Be bruker logge ut/inn
   - Gå til Settings
   - Klikk "Manage Subscription"
   - Skal åpne Stripe billing portal

---

## 🧪 LØSNING 4: TEST WEBHOOK MED STRIPE CLI

### Installér Stripe CLI:
```bash
# Windows (med Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Eller last ned fra: https://stripe.com/docs/stripe-cli
```

### Login til Stripe:
```bash
stripe login
```

### Test Webhook Lokalt:
```bash
# Start dev server
npm run dev

# I ny terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Se webhook signing secret i output (whsec_XXX)
# Oppdater STRIPE_WEBHOOK_SECRET i .env.local
```

### Send Test Event:
```bash
stripe trigger checkout.session.completed
```

### Se Logs:
- Stripe CLI viser webhook events
- Terminal med `npm run dev` viser API logs
- Sjekk om Supabase oppdateres

---

## 🔐 LØSNING 5: VERIFISER WEBHOOK SECRET

### Sjekk at Secret er korrekt:

1. **Stripe Dashboard** → **Webhooks** → **webhook URL**
2. Se "Signing secret" (whsec_XXX)
3. Sammenlign med Vercel env var:
   - Gå til **Vercel Dashboard** → **Settings** → **Environment Variables**
   - Se `STRIPE_WEBHOOK_SECRET`
   - Må matche Stripe secret **NØYAKTIG**

### Hvis Secret er feil:
- Webhook får 400 Bad Request
- Events proceseres ikke
- FIX: Oppdater `STRIPE_WEBHOOK_SECRET` i Vercel

---

## 📊 LØSNING 6: SJEKK SUPABASE RLS POLICIES

### Test om Service Role Key virker:

```sql
-- Kjør i Supabase SQL Editor
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';
```

### Hvis RLS blokkerer UPDATE:
Service role key skal bypasse RLS, men hvis ikke:

```sql
-- Slå av RLS midlertidig for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Test webhook igjen

-- Slå på RLS igjen
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

## ✅ VERIFICATION CHECKLIST

Etter fix, verifiser at alt virker:

### For Hver Betalende Bruker:

1. **Supabase Check:**
```sql
SELECT 
  email,
  is_premium,
  stripe_customer_id,
  stripe_subscription_id,
  premium_expires_at,
  (premium_expires_at > NOW()) as "active"
FROM users 
WHERE email = 'USER_EMAIL_HERE';
```

Skal vise:
- ✅ `is_premium = true`
- ✅ `stripe_customer_id = cus_XXX`
- ✅ `stripe_subscription_id = sub_XXX`
- ✅ `premium_expires_at` in future
- ✅ `active = true`

2. **Frontend Check:**
   - Bruker logger ut/inn
   - Dashboard: NO "1 free try" badges
   - Sidebar: "Manage Subscription" button visible
   - Upload: NO trial restrictions

3. **Stripe Portal Check:**
   - Klikk "Manage Subscription"
   - Skal åpne Stripe billing portal
   - Viser active subscription
   - Kan cancel/update

---

## 🎯 ANBEFALT FREMGANGSMÅTE:

**I DENNE REKKEFØLGEN:**

1. ✅ **Kjør `sync-stripe-to-supabase.js`** (løser 90% av problemene)
2. ✅ **Be alle brukere logge ut/inn**
3. ✅ **Test på én bruker først** (nathanielfisk54@gmail.com)
4. ⏳ **Hvis ikke virker:** Manuell SQL update (Løsning 3)
5. ⏳ **Hvis fortsatt ikke virker:** Debug webhook med Stripe CLI (Løsning 4)

---

## 📞 HVIS INGENTING VIRKER:

### Kjør Denne Diagnosen:

```bash
# 1. Sjekk at alle env vars er satt
node -e "console.log({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.slice(0,10),
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.slice(0,10),
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0,10)
})"

# 2. Test Stripe connection
node -e "const Stripe = require('stripe'); const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); stripe.customers.list({limit: 1}).then(r => console.log('Stripe OK:', r.data.length + ' customers')).catch(e => console.error('Stripe Error:', e.message))"

# 3. Test Supabase connection
node -e "const {createClient} = require('@supabase/supabase-js'); const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); sb.from('users').select('count').then(r => console.log('Supabase OK:', r)).catch(e => console.error('Supabase Error:', e))"
```

---

## 🚀 QUICK START (TL;DR):

```bash
# 1. Sync all Stripe data to Supabase
node sync-stripe-to-supabase.js

# 2. Tell users to logout/login

# 3. Done! Premium should work.
```

---

**Spør meg hvis noe ikke virker!** 🤝
