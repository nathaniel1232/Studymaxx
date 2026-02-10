# PREMIUM AUTOMATISK AKTIVERING - FEILSØKING

## Problem
Brukere får ikke premium automatisk etter betaling i Stripe.

## Løsning 1: FIX MANUELT (UMIDDELBART)
```bash
node fix-single-user.js EMAIL_HER
```

Eksempel:
```bash
node fix-single-user.js servicesflh@gmail.com
```

## Løsning 2: FIX WEBHOOK (PERMANENT)

### 1. Sjekk Stripe Webhook Konfigurering

1. Gå til https://dashboard.stripe.com/webhooks
2. Finn webhook til Vercel
3. **URL må være:** `https://your-domain.vercel.app/api/stripe/webhook`
4. **Events må være checked:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

### 2. Sjekk Webhook Secret

1. I Stripe webhook dashboard, klikk på webhook
2. Klikk "Reveal" på signing secret
3. Kopier secret (starter med `whsec_...`)
4. **Legg til i Vercel environment variables:**
   - Gå til Vercel dashboard → Settings → Environment Variables
   - Navn: `STRIPE_WEBHOOK_SECRET`
   - Verdi: `whsec_...` (fra Stripe)
   - Environment: **Production** og **Preview** og **Development**
   - Klikk Save
5. **REDEPLOY** Vercel etter endring

### 3. Test Webhook

1. I Stripe webhook dashboard, klikk "Send test webhook"
2. Velg event: `checkout.session.completed`
3. Send test
4. Sjekk Vercel logs for:
   - `[Webhook] ✅ Event signature verified`
   - `[Webhook] CHECKOUT SESSION COMPLETED`
   - `[Webhook] ✅ User upgraded to Premium`

### 4. Sjekk checkout sessions sender userId

I `/api/stripe/checkout/route.ts`, linje ~100:
```typescript
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  client_reference_id: user.id, // ✅ DETTE MÅ VÆRE DER
  metadata: {
    userId: user.id, // ✅ DETTE MÅ VÆRE DER
  },
  // ... resten
});
```

## Løsning 3: DEBUG WEBHOOK

### Sjekk Vercel Logs
1. Gå til https://vercel.com/dashboard
2. Velg prosjekt
3. Klikk "Logs"
4. Filtrer på "webhook" eller "/api/stripe/webhook"
5. Se etter errors:
   - `Webhook signature verification failed` → Feil webhook secret
   - `Cannot identify user - no userId` → checkout sender ikke userId
   - `Error checking existing user` → Supabase connection problem

### Test Lokalt
```bash
# 1. Install Stripe CLI
# Windows: scoop install stripe

# 2. Login to Stripe
stripe login

# 3. Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 4. Start development server
npm run dev

# 5. Make a test purchase and watch console logs
```

## Vanlige Problemer

### Problem: "Webhook signature verification failed"
**Løsning:** 
- Webhook secret i Vercel matcher ikke Stripe
- Oppdater `STRIPE_WEBHOOK_SECRET` i Vercel
- Redeploy

### Problem: "Cannot identify user - no userId"
**Løsning:**
- checkout/route.ts sender ikke userId i metadata
- Sjekk at `client_reference_id` og `metadata.userId` settes

### Problem: "User does not exist"
**Løsning:**
- User ikke opprettet i Supabase før checkout
- Webhook prøver å oppdatere user som ikke finnes
- Bruk fix-single-user.js script

## Automatisk Fix for Fremtidige Brukere

Etter du har fikset webhook:
1. Test med en ny bruker
2. Kjøp premium
3. Sjekk at premium aktiveres umiddelbart (ingen logout/login nødvendig)

## Emergency Contact

Hvis en premium-bruker ikke får tilgang:
1. **FIX UMIDDELBART:**
   ```bash
   node fix-single-user.js email@example.com
   ```
2. Be brukeren logout og login på nytt
3. Sjekk Stripe at betalingen gikk gjennom
4. Sjekk Vercel logs for webhook errors

---

## Status for servicesflh@gmail.com

✅ **FIKSET:** Premium aktivert manuelt med script
- Customer ID: `cus_TwtDk2qH0uPphS`
- Subscription ID: `sub_1SyzSZPDFQXMY7ipFMJvQNrK`
- Expires: 2026-03-11

**Neste steg:** Fiks webhook for å unngå manuelle fixes i fremtiden.
