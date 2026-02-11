# Sette opp Custom Google OAuth for å endre App-navn

## Problemet
Du bruker Supabase sin default Google OAuth → Det viser Supabase sitt "Project ID" på innloggingsskjermen.

## Løsningen
Lag din egen Google OAuth client → Konfigurer i Supabase → Vis "StudyMaxx" i stedet.

---

## 📋 KOMPLETT STEG-FOR-STEG GUIDE

### Del 1: Lag Google OAuth Client (10 min)

#### 1. Gå til Google Cloud Console
- Åpne: https://console.cloud.google.com
- Logg inn med Google-kontoen din

#### 2. Opprett nytt prosjekt (eller bruk eksisterende)
1. Klikk dropdown øverst (ved siden av "Google Cloud")
2. Klikk **"NEW PROJECT"**
3. **Project name**: `StudyMaxx` (vises ikke til brukere)
4. Klikk **CREATE**
5. Vent til prosjektet er opprettet (~30 sekunder)
6. Velg det nye prosjektet fra dropdown

#### 3. Aktiver Google+ API (VIKTIG!)
1. Gå til **APIs & Services** → **Library** (venstremeny)
2. Søk etter: `Google+ API`
3. Klikk på **Google+ API**
4. Klikk **ENABLE**

#### 4. Konfigurer OAuth Consent Screen
1. Gå til **APIs & Services** → **OAuth consent screen** (venstremeny)
2. Velg **External** (for alle brukere)
3. Klikk **CREATE**

**App information:**
- **App name**: `StudyMaxx` ← Dette ser brukerne!
- **User support email**: Din e-post
- **App logo**: Last opp logo (valgfritt, 120x120px minimum)

**App domain:**
- **Application home page**: `https://www.studymaxx.net`
- **Application privacy policy**: `https://www.studymaxx.net/privacy` (hvis du har)
- **Application terms of service**: `https://www.studymaxx.net/terms` (hvis du har)

**Authorized domains:**
- Klikk **+ ADD DOMAIN**
- Legg til: `studymaxx.net`
- Legg til: `supabase.co`

**Developer contact information:**
- Legg til din e-post

Klikk **SAVE AND CONTINUE**

#### 5. Scopes (Ikke endre noe her)
- Klikk **SAVE AND CONTINUE** (hopp over)

#### 6. Test users (Valgfritt)
- Hvis du vil teste med spesifikke e-poster først
- Klikk **+ ADD USERS** og legg til e-poster
- Ellers, klikk **SAVE AND CONTINUE**

#### 7. Summary
- Sjekk at alt ser riktig ut
- Klikk **BACK TO DASHBOARD**

#### 8. Opprett OAuth Client ID
1. Gå til **APIs & Services** → **Credentials** (venstremeny)
2. Klikk **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: Velg **Web application**
4. **Name**: `StudyMaxx Web Client`

**Authorized JavaScript origins:**
- Klikk **+ ADD URI**
- Legg til: `https://www.studymaxx.net`
- Legg til: `http://localhost:3000` (for lokal utvikling)

**Authorized redirect URIs:**
- Klikk **+ ADD URI**
- Legg til: `https://zvcawkxlhzhldhydxliv.supabase.co/auth/v1/callback`
  ↑ VIKTIG: Bruk DIN Supabase URL (fra .env.local)

Klikk **CREATE**

#### 9. Kopier credentials
Du får nå en popup med:
- **Client ID**: Ser ut som `123456789-abc123.apps.googleusercontent.com`
- **Client secret**: Ser ut som `GOCSPX-abc123def456`

**VIKTIG**: Kopier begge disse! Du trenger dem i neste steg.

---

### Del 2: Konfigurer i Supabase (5 min)

#### 1. Gå til Supabase Dashboard
- Åpne: https://supabase.com/dashboard
- Velg ditt prosjekt: `zvcawkxlhzhldhydxliv`

#### 2. Konfigurer Google Provider
1. Gå til **Authentication** → **Providers** (venstremeny)
2. Scroll ned til **Google**
3. Klikk for å utvide

**Enabled**: ✅ ON

**Client ID (for OAuth)**: 
- Lim inn Client ID fra Google Cloud Console

**Client Secret (for OAuth)**:
- Lim inn Client Secret fra Google Cloud Console

Klikk **SAVE**

---

### Del 3: Test det (2 min)

#### 1. Restart dev server
```powershell
npm run dev
```

#### 2. Test innlogging
1. Åpne https://www.studymaxx.net (eller localhost:3000)
2. Klikk "Continue with Google"
3. Du skal nå se:
   - ✅ "StudyMaxx" (ditt app-navn)
   - ✅ Logo (hvis du lastet opp)
   - ❌ IKKE "Project ID: abc123"

---

## 🎉 Resultat

**Før:**
```
Continue to confirm your account at:
zvcawkxlhzhldhydxliv (Supabase Project ID)
```

**Etter:**
```
Continue to confirm your account at:
StudyMaxx
[Ditt logo]
```

---

## 🔧 Feilsøking

### Problem: "Error 400: redirect_uri_mismatch"
**Løsning**: Gå tilbake til Google Cloud Console → Credentials → Edit OAuth Client → Sjekk at redirect URI matcher EKSAKT:
```
https://zvcawkxlhzhldhydxliv.supabase.co/auth/v1/callback
```

### Problem: "Access blocked: This app's request is invalid"
**Løsning**: Du glemte å aktivere Google+ API. Gå til Google Cloud Console → APIs & Services → Library → Aktiver Google+ API.

### Problem: "This app isn't verified"
**Løsning**: Dette er normalt for nye apper under testing. Du har to valg:
1. Klikk **Advanced** → **Go to StudyMaxx (unsafe)** (for testing)
2. Søk om verifisering fra Google (tar 1-2 uker + krever privacy policy)

---

## 💡 Tips

### For lokal utvikling (localhost)
Legg til i Google Cloud Console → Credentials → OAuth Client:
- **Authorized JavaScript origins**: `http://localhost:3000`
- **Authorized redirect URIs**: `https://zvcawkxlhzhldhydxliv.supabase.co/auth/v1/callback` (samme som prod)

### For å endre app-navn senere
Google Cloud Console → OAuth consent screen → EDIT APP → Endre "App name" → SAVE

---

## 📎 Quick Reference

Ting du trenger:
- ✅ Google Cloud Console account
- ✅ Supabase Dashboard access
- ✅ 15 minutter

Credentials format:
```
Client ID: 123456789-abc123def456.apps.googleusercontent.com
Client Secret: GOCSPX-abc123def456ghi789
Redirect URI: https://[DIN-SUPABASE-URL].supabase.co/auth/v1/callback
```

