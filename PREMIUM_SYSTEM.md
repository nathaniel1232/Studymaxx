# Premium System Implementation - StudyMaxx

## 🎯 OVERVIEW

Dette er et EKTE premium-system som beskytter AI-kostnader med server-side enforcement.
Alle grenser håndheves på backend - ingen tillitsmodeller på frontend.

## 📊 BRUKER STATUS (Database Felter)

```sql
users {
  id: TEXT (Primary Key)
  is_premium: BOOLEAN (default: false)
  study_set_count: INTEGER (default: 0) -- Total studiesett opprettet
  daily_ai_count: INTEGER (default: 0) -- AI-genereringer i dag
  last_ai_reset: TIMESTAMPTZ -- Siste gang daily counter ble nullstilt
  email: TEXT (optional)
  account_id: TEXT (optional)
}
```

## 🚦 GRENSER (HARD ENFORCED)

### Gratis Bruker
- ❌ **1 studiesett TOTALT** (ikke per dag)
- ❌ **1 AI-generering per dag**
- ❌ **Maks 15 flashcards per sett**
- ❌ **Kun tekst** (ingen PDF/YouTube/bilder)
- ❌ **Ingen deling**
- ❌ **Ingen vanskelighetsgrad**

### Premium Bruker
- ✅ **Ubegrensede studiesett**
- ✅ **Ubegrenset AI-bruk**
- ✅ **Ubegrensede flashcards**
- ✅ **PDF-opplasting**
- ✅ **YouTube transcripts**
- ✅ **Bildeopplasting**
- ✅ **Deling av studiesett**
- ✅ **Vanskelighetsgrad valg**

## 🏗️ ARKITEKTUR

### 1. Central AI Gateway: `/api/generate`

**ALL AI må gå via dette endepunktet.**

```typescript
POST /api/generate
{
  userId: string,
  text: string,
  numberOfFlashcards: number,
  subject?: string,
  targetGrade?: string,
  difficulty?: string,
  language?: string
}
```

**Flyt:**
1. Hent bruker fra database
2. Reset `daily_ai_count` hvis ny dag
3. Sjekk `canUseAI(userStatus)`:
   - Hvis `studySetCount >= 1` → 402 PREMIUM_REQUIRED
   - Hvis `dailyAiCount >= 1` → 429 DAILY_LIMIT_REACHED
4. Kall GPT-4o mini med `max_tokens: 800`
5. Inkrementer tellere kun ved suksess
6. Returner flashcards

### 2. Legacy Wrapper: `/api/flashcards`

Delegerer til `/api/generate` for bakoverkompatibilitet.

### 3. Premium Utilities: `/app/utils/premium.ts`

**Sentrale funksjoner:**
- `canUseAI(userStatus)` - ÉN SANNHET for AI-tilgang
- `shouldResetDailyCounter(lastAiReset)` - Sjekk om ny dag
- `validateFlashcardCount(count, isPremium)` - Sjekk flashcard-grense
- `canUseFeature(feature, isPremium)` - Sjekk feature-tilgang

### 4. Frontend: Error Handling

```typescript
try {
  const cards = await generateFlashcards(text, count, subject, grade, userId);
} catch (err) {
  if (err.message === "PREMIUM_REQUIRED") {
    setShowPremiumModal(true); // Vis premium modal
  } else if (err.message === "DAILY_LIMIT_REACHED") {
    setIsDailyLimit(true);
    setShowPremiumModal(true); // Vis daglig grense modal
  }
}
```

## 🔒 SIKKERHET

### ✅ DET VI GJØR
- All logikk på backend
- Database som én sannhet
- Klare feilkoder (402, 429)
- Reset daily counter automatisk
- GPT-4o mini for kostnads-kontroll
- `max_tokens` for å begrense svar-størrelse
- Inkrementer tellere kun ved suksess

### ❌ DET VI IKKE GJØR
- Stol på frontend-sjekker
- Ubegrensede tokens
- Hardkod premium i UI
- Duplikat logikk flere steder

## 📈 BRUK AV SYSTEMET

### Backend (API Route)
```typescript
import { canUseAI, shouldResetDailyCounter } from "@/app/utils/premium";

// 1. Hent bruker
let userStatus = await getOrCreateUser(userId);

// 2. Reset counter hvis nødvendig
if (shouldResetDailyCounter(userStatus.lastAiReset)) {
  userStatus = await resetDailyCounter(userId);
}

// 3. Sjekk tilgang (KRITISK)
const check = canUseAI(userStatus);
if (!check.allowed) {
  return NextResponse.json(
    { error: check.reason, code: "..." },
    { status: check.statusCode }
  );
}

// 4. Utfør AI-kall
// 5. Inkrementer tellere
```

### Frontend
```typescript
import { generateFlashcards } from "@/app/utils/flashcardGenerator";

try {
  const cards = await generateFlashcards(text, count, subject, grade, userId);
  // Success!
} catch (err) {
  // Handle 402 / 429 errors with modals
}
```

## 🎨 UI/UX

### PremiumModal
- Viser når bruker treffer grenser
- To varianter:
  - `isDailyLimit=false`: "Oppgrader til Premium" (studiesett-grense)
  - `isDailyLimit=true`: "Daglig grense nådd" (daily AI limit)
- Forklarer hvorfor Premium koster penger
- Viser klare fordeler
- Link til e-post for varsling

### Feilhåndtering
- **402 Payment Required**: Studiesett-grense nådd
- **429 Too Many Requests**: Daglig AI-grense nådd
- Frontend viser passende modal basert på feilkode

## 🚀 TESTING

### Test Gratis Bruker Flow
1. Opprett første studiesett → ✅ Skal fungere
2. Prøv å opprette andre studiesett → ❌ Skal vise Premium-modal
3. Vent til neste dag → ✅ Kan bruke AI igjen (1 gang)

### Test Premium Bruker Flow
1. Sett `is_premium = true` i database
2. Opprett ubegrenset antall studiesett → ✅ Skal fungere
3. Generer ubegrensede flashcards → ✅ Skal fungere

### Database Testing
```sql
-- Se brukerstatistikk
SELECT id, is_premium, study_set_count, daily_ai_count, last_ai_reset 
FROM users;

-- Manuell reset (for testing)
UPDATE users 
SET daily_ai_count = 0, last_ai_reset = NOW() 
WHERE id = 'test-user-id';

-- Gi premium (for testing)
UPDATE users 
SET is_premium = true 
WHERE id = 'test-user-id';
```

## 📝 NESTE STEG (Fremtidig)

1. **Stripe Integration**
   - Legg til `/api/stripe/checkout` for betaling
   - Legg til webhook for å oppdatere `is_premium`
   - Automatisk premium-tildeling

2. **Deling (Premium-only)**
   - Implementer `/api/share` endpoint
   - Lag unique share IDs
   - Read-only visning for ikke-premium

3. **PDF/YouTube (Premium-only)**
   - Sjekk `canUseFeature('pdf')` på backend
   - Returner 402 hvis ikke premium

## 🐛 FEILSØKING

### Problem: Daily counter resettes ikke
**Løsning:** Sjekk `shouldResetDailyCounter()` logikk i `/api/generate`

### Problem: Tellere ikke inkrementeres
**Løsning:** Sjekk `incrementUsageCounters()` i `/api/generate`

### Problem: Frontend viser ikke premium-modal
**Løsning:** Sjekk at error-handling i `CreateFlowView.tsx` fanger 402/429

### Problem: GPT-kostnader for høye
**Løsning:** Reduser `max_tokens` i `/api/generate` (nåværende: 800)

## 💰 KOSTNADSBEREGNING

### GPT-4o mini Pricing (ca. estimat)
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

### Per Generering (estimat)
- Input: ~500 tokens (notater)
- Output: ~800 tokens (flashcards)
- Kostnad: ~$0.0006 per generering

### Gratis Bruker (1 per dag)
- 30 dager: 30 * $0.0006 = ~$0.018/måned

### Premium Bruker (unlimited)
- 100 genereringer/måned: $0.06/måned
- Vi tar 49 kr = ~$4.50/måned
- Margin: $4.44/måned per bruker

**Konklusjon:** Systemet er bærekraftig med disse grensene.

## ✅ FERDIG

Premium-systemet er nå fullstendig implementert med:
- ✅ Server-side enforcement
- ✅ Database-drevet brukerstatus
- ✅ GPT-4o mini for kostnadskontroll
- ✅ Klare feilkoder (402, 429)
- ✅ Frontend error handling
- ✅ Premium modal med tydelig verdi-prop
- ✅ Daily reset automatikk
- ✅ Ingen frontend-only sperrer

**Neste steg:** Deploy til produksjon og test med ekte brukere!
