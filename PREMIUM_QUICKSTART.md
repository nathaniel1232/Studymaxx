# 🚀 Premium System - Quick Start Guide

## OPPSETT

### 1. Database Setup (Supabase)

Kjør SQL-scriptet for å oppdatere databasen:

```sql
-- Oppdater users tabellen med nye felter
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS study_set_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_ai_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ai_reset TIMESTAMPTZ DEFAULT NOW();

-- Fjern gammel sets_created kolonne hvis den finnes
ALTER TABLE public.users DROP COLUMN IF EXISTS sets_created;
```

Eller bruk den komplette `supabase_premium_schema.sql` filen.

### 2. Environment Variables

Sørg for at disse er satt i `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

### 3. Start Development Server

```bash
npm install
npm run dev
```

## 🧪 TESTING

### Test 1: Gratis Bruker - Første Studiesett

1. Gå til appen (http://localhost:3000)
2. Klikk "Lag nytt studiesett"
3. Skriv inn et fag og notater
4. Generer flashcards
5. ✅ **FORVENTET:** Fungerer normalt

### Test 2: Gratis Bruker - Andre Studiesett

1. Prøv å lage et nytt studiesett
2. ❌ **FORVENTET:** Premium-modal vises med melding "Du har nådd grensen på 1 studiesett"

### Test 3: Gratis Bruker - Daily Limit

1. Åpne Supabase dashboard
2. Nullstill tellere:
   ```sql
   UPDATE users SET study_set_count = 0, daily_ai_count = 1 
   WHERE id = 'your-user-id';
   ```
3. Prøv å generere flashcards
4. ❌ **FORVENTET:** Modal vises med "Daglig grense nådd" (⏰ ikon)

### Test 4: Premium Bruker

1. Sett bruker til premium:
   ```sql
   UPDATE users SET is_premium = true WHERE id = 'your-user-id';
   ```
2. Opprett flere studiesett
3. ✅ **FORVENTET:** Ubegrenset tilgang

## 📊 DATABASE QUERIES

### Se Alle Brukere
```sql
SELECT 
  id, 
  is_premium, 
  study_set_count, 
  daily_ai_count, 
  last_ai_reset,
  created_at 
FROM users 
ORDER BY created_at DESC;
```

### Reset En Bruker
```sql
UPDATE users 
SET 
  study_set_count = 0,
  daily_ai_count = 0,
  last_ai_reset = NOW()
WHERE id = 'user-id-here';
```

### Gi Premium (Testing)
```sql
UPDATE users 
SET is_premium = true 
WHERE id = 'user-id-here';
```

### Fjern Premium
```sql
UPDATE users 
SET is_premium = false 
WHERE id = 'user-id-here';
```

### Se Statistikk
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_premium = true) as premium_users,
  COUNT(*) FILTER (WHERE is_premium = false) as free_users,
  AVG(study_set_count) as avg_sets_per_user,
  AVG(daily_ai_count) as avg_daily_ai_use
FROM users;
```

## 🔍 DEBUG TIPS

### Problem: Modal vises ikke

**Sjekk:**
1. Console i browser for JavaScript-feil
2. Network tab for API-responser
3. At feilkodene 402/429 returneres fra backend

**Fix:**
```typescript
// I CreateFlowView.tsx
console.log('Error:', err.message);
console.log('Error includes Premium?', err.message.includes('Premium'));
```

### Problem: Tellere ikke oppdateres

**Sjekk:**
1. Supabase logs i dashboard
2. Server console for feilmeldinger
3. At `/api/generate` kalles (ikke gammel `/api/flashcards` direkte)

**Fix:**
```typescript
// I /api/generate/route.ts
console.log('Before increment:', userStatus);
await incrementUsageCounters(userId, isNewSet);
console.log('After increment');
```

### Problem: Daily counter ikke resettes

**Sjekk:**
1. `shouldResetDailyCounter()` logikk
2. Timezone på server vs database
3. `last_ai_reset` felt i database

**Manual reset:**
```sql
UPDATE users 
SET daily_ai_count = 0, last_ai_reset = NOW() 
WHERE id = 'user-id';
```

## 📱 FRONTEND FLOW

```
User clicks "Generate"
         ↓
CreateFlowView.handleGenerate()
         ↓
generateFlashcards(text, count, ..., userId)
         ↓
POST /api/flashcards (wrapper)
         ↓
POST /api/generate (real AI gateway)
         ↓
Check: canUseAI(userStatus)
         ↓
    ┌────┴────┐
    NO       YES
    ↓         ↓
402/429   Generate
    ↓         ↓
Modal    Increment
         Counters
```

## ⚙️ CONFIGURATION

### Endre Gratis-Grenser

Rediger `app/utils/premium.ts`:

```typescript
export const FREE_LIMITS: UsageLimits = {
  maxStudySets: 1,              // ← Endre her
  maxFlashcardsPerSet: 15,      // ← Endre her
  maxAIGenerationsPerDay: 1,    // ← Endre her
  // ...
};
```

### Endre AI Model

Rediger `app/api/generate/route.ts`:

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",   // ← Endre her
  max_tokens: 800,        // ← Endre her
  // ...
});
```

### Endre Premium Pris

Rediger `app/utils/premium.ts`:

```typescript
export const PRICING = {
  monthly: {
    price: 49,        // ← Endre her (NOK)
    currency: 'NOK',
    interval: 'month',
  },
};
```

## 🎯 KJENTE BEGRENSNINGER

1. **Ingen Stripe enda**: Premium må settes manuelt i database
2. **Ingen e-postvarslinger**: Premium-lansering varsles kun via modal
3. **Anonym ID**: userId lagres i localStorage (ikke permanent ved cache-clear)
4. **Ingen refund-logikk**: Må håndteres manuelt
5. **Ingen usage analytics**: Må kjøre SQL-queries manuelt

## 📚 DOKUMENTASJON

- Hoveddokumentasjon: `PREMIUM_SYSTEM.md`
- Database schema: `supabase_premium_schema.sql`
- API routes:
  - `/api/generate/route.ts` - AI gateway
  - `/api/flashcards/route.ts` - Legacy wrapper
- Utilities: `/app/utils/premium.ts`
- Frontend: `/app/components/CreateFlowView.tsx`, `PremiumModal.tsx`

## ✅ CHECKLIST FOR DEPLOY

- [ ] Database schema kjørt på production Supabase
- [ ] Environment variables satt i production
- [ ] OpenAI API key fungerer
- [ ] Test gratis flow i production
- [ ] Test premium flow (manual database update)
- [ ] Monitor costs i OpenAI dashboard
- [ ] Set up alerts for høy usage

## 🆘 SUPPORT

Ved problemer:
1. Sjekk `PREMIUM_SYSTEM.md` for detaljer
2. Sjekk browser console for feil
3. Sjekk server logs (Vercel/Railway/etc)
4. Sjekk Supabase logs i dashboard
5. Kontakt: studymaxxer@gmail.com
