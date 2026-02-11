# Endre Google OAuth App-Navn og Logo

Når brukere logger inn med Google, vises et navn og logo på innloggingsskjermen. Slik endrer du det:

## 📝 Steg-for-steg guide

### 1. Gå til Google Cloud Console
1. Åpne [Google Cloud Console](https://console.cloud.google.com)
2. Velg prosjektet ditt (samme som brukes for Supabase)
3. Gå til **APIs & Services** → **OAuth consent screen** (venstremeny)

### 2. Rediger Consent Screen
Klikk **EDIT APP** øverst

### 3. Endre App-informasjon

#### **App name** (viktigst!)
- Dette er navnet som vises på innloggingsskjermen
- Anbefalt: **"StudyMaxx"** eller **"StudyMaxx Premium"**
- Dette er det brukerne ser i stedet for "Project ID"

#### **User support email**
- E-postadressen brukere kan kontakte for support
- Bruk din primære e-post

#### **App logo** (valgfritt)
- Last opp en logo (120x120 piksler minimum)
- Dette vises sammen med app-navnet
- PNG/JPG format

#### **Application home page** (valgfritt)
- https://www.studymaxx.net

#### **Application privacy policy link** (anbefalt)
- Hvis du har en privacy policy-side
- Eksempel: https://www.studymaxx.net/privacy

#### **Application terms of service link** (valgfritt)
- Eksempel: https://www.studymaxx.net/terms

### 4. Authorized domains
- Legg til: `studymaxx.net` 
- Legg til: `supabase.co` (for Supabase OAuth)

### 5. Developer contact information
- Legg til din e-postadresse

### 6. Lagre
1. Klikk **SAVE AND CONTINUE** 
2. Gå gjennom resten av stegene (Scopes, Test users)
3. Klikk **SAVE AND CONTINUE** til du kommer til slutten
4. Klikk **BACK TO DASHBOARD**

## ⏱️ Endringene tar effekt
- **Testkonto**: Umiddelbart
- **Produksjon**: 5-10 minutter

## ✅ Test det
1. Åpne en inkognitofane
2. Gå til https://www.studymaxx.net
3. Klikk "Continue with Google"
4. Du skal nå se det nye navnet i stedet for "Project ID"

## 📸 Før og Etter

### Før:
```
Continue to confirm your account at:
[Project ID: your-project-123456]
```

### Etter:
```
Continue to confirm your account at:
[StudyMaxx]
```

## 🔄 Hvis du vil endre logo senere
1. Samme prosess: Google Cloud Console → OAuth consent screen → EDIT APP
2. Last opp nytt bilde under "App logo"
3. Klikk SAVE AND CONTINUE

## 🚨 Viktig!
- Ikke slett OAuth Client ID-en når du redigerer
- Endringer i "App name" påvirker IKKE Supabase-konfigurasjonen
- Du trenger IKKE å oppdatere noe i Supabase etter dette

---

## 🎯 Anbefalt Konfigurasjon for StudyMaxx

| Felt | Verdi |
|------|-------|
| **App name** | StudyMaxx |
| **User support email** | din@email.com |
| **App logo** | StudyMaxx logo (120x120px) |
| **Application home page** | https://www.studymaxx.net |
| **Authorized domains** | studymaxx.net, supabase.co |

