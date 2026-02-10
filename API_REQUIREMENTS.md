# StudyMaxx - Complete API Requirements

## Current Environment Status ✅

Your `.env.local` file currently has:

### ✅ CONFIGURED & WORKING
1. **OpenAI API** (ChatGPT)
   - Key: `sk-proj-Y5n3nJ...` 
   - Used for: PDF OCR (GPT-4o-mini), Whisper transcription, image analysis
   - Status: ✅ Active

2. **Vertex AI / Google Cloud** (Gemini 2.5 Flash)
   - Project: `studymaxx-486118`
   - Credentials: ✅ JSON embedded in .env.local
   - Used for: Main flashcard generation, AI summaries, chat
   - Status: ✅ Active (credentials updated today)

3. **Deepgram API** (Audio transcription)
   - Key: `f2a477...`
   - Used for: Fallback audio transcription ($200 free credit)
   - Status: ✅ Active

4. **Supabase** (Database & Auth)
   - URL: `https://zvcawkxlhzhldhydxliv.supabase.co/`
   - Anon Key: ✅ Set
   - Service Role Key: ✅ Set
   - Used for: User auth, flashcard storage, premium status
   - Status: ✅ Active

5. **Stripe** (Payments)
   - Live keys: ✅ Set
   - Webhook secret: ✅ Set
   - Price IDs: ✅ Set
   - Used for: Premium subscriptions
   - Status: ✅ Active

6. **Resend** (Email service)
   - Key: `re_jS3Row...`
   - Used for: Premium welcome emails
   - Status: ✅ Active

---

## Complete Feature → API Mapping

### 🎤 Audio Recording & Transcription
**APIs Needed:**
1. **OpenAI Whisper** (primary) - via `OPENAI_API_KEY`
2. **Deepgram Nova-2** (fallback) - via `DEEPGRAM_API_KEY`
3. **Vertex AI Gemini 2.0 Flash** (summary) - via `GOOGLE_APPLICATION_CREDENTIALS` + `VERTEX_AI_PROJECT_ID`

**Endpoints:**
- POST `/api/transcribe` (handles audio → text → summary)

---

### 📄 PDF Uploads
**APIs Needed:**
1. **pdf-parse library** (text extraction, server-side)
2. **OpenAI GPT-4o-mini** (OCR for scanned PDFs) - via `OPENAI_API_KEY`

**Endpoints:**
- POST `/api/extract-pdf`

**How it works:**
1. First tries text extraction with `pdf-parse`
2. If text is too short (< 50 chars), assumes image-based PDF
3. Sends PDF to GPT-4o-mini Vision for OCR

---

### 🖼️ Image Uploads
**APIs Needed:**
1. **OpenAI GPT-4o-mini Vision** - via `OPENAI_API_KEY`

**Endpoints:**
- POST `/api/extract-image`

**Supported formats:** JPG, PNG, WebP

---

### 📊 PowerPoint / PPTX Uploads
**APIs Needed:**
1. **mammoth library** (server-side PPTX parsing)
2. No external API needed

**Endpoints:**
- POST `/api/extract-pptx`

---

### 📝 Text / DOCX Uploads
**APIs Needed:**
1. **mammoth library** (server-side DOCX parsing)
2. No external API needed

**Endpoints:**
- POST `/api/extract-text`
- POST `/api/extract-docx`

---

### 🎬 YouTube Video Import
**APIs Needed:**
1. **Deepgram Nova-2** (transcript download & processing) - via `DEEPGRAM_API_KEY`

**Endpoints:**
- POST `/api/youtube-transcript`

**How it works:**
- Extracts video ID from URL
- Downloads transcript via Deepgram YouTube integration
- No YouTube API key needed (Deepgram handles it)

---

### 🌐 Website Import
**APIs Needed:**
1. **Cheerio library** (server-side HTML parsing)
2. No external API needed

**Endpoints:**
- POST `/api/extract-website`

---

### 🎴 Flashcard Generation
**APIs Needed:**
1. **Vertex AI Gemini 2.5 Flash** - via `GOOGLE_APPLICATION_CREDENTIALS` + `VERTEX_AI_PROJECT_ID`

**Endpoints:**
- POST `/api/generate`
- POST `/api/flashcards` (wrapper to `/api/generate`)

**Features:**
- Difficulty levels (Easy/Medium/Hard)
- Card count customization (5-100)
- Multi-language output

---

### 📝 Quiz Generation
**APIs Needed:**
1. **Vertex AI Gemini 2.5 Flash** - via `GOOGLE_APPLICATION_CREDENTIALS` + `VERTEX_AI_PROJECT_ID`

**Endpoints:**
- POST `/api/generate-quiz`

**Question types:**
- Multiple choice
- Written/open-ended

---

### 🎮 Match Game Generation
**APIs Needed:**
1. **Vertex AI Gemini 2.5 Flash** - via `GOOGLE_APPLICATION_CREDENTIALS` + `VERTEX_AI_PROJECT_ID`

**Endpoints:**
- POST `/api/generate` (with match mode)

**Features:**
- 4-10 pairs (free users)
- 4-25 pairs (premium users)

---

### 💬 AI Chat (Study Sets)
**APIs Needed:**
1. **Vertex AI Gemini 2.5 Flash** - via `GOOGLE_APPLICATION_CREDENTIALS` + `VERTEX_AI_PROJECT_ID`

**Endpoints:**
- POST `/api/chat`

---

### 🔐 Authentication
**APIs Needed:**
1. **Supabase Auth** - via `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Features:**
- Magic link email login
- Google OAuth
- Session management

---

### 💳 Premium Subscriptions
**APIs Needed:**
1. **Stripe Payment Processing** - via `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. **Stripe Webhooks** - via `STRIPE_WEBHOOK_SECRET`
3. **Resend Email** (welcome emails) - via `RESEND_API_KEY`

**Endpoints:**
- POST `/api/create-checkout`
- POST `/api/create-portal`
- POST `/api/webhooks/stripe`
- POST `/api/send-premium-email`

---

## 🔧 Troubleshooting PDF Upload Issue

### Most Likely Causes:

1. **Server not restarted after env var change**
   - ✅ FIXED: Server was restarted with new credentials

2. **OpenAI API quota exceeded**
   - Check: https://platform.openai.com/usage
   - Your key: `sk-proj-Y5n3nJSNK11guSnhmCNLMjFokcZoEiGAl7gd...`

3. **Browser console errors**
   - Open DevTools (F12) → Console tab
   - Look for red errors when uploading PDF

4. **File size too large**
   - Max: 25MB per file
   - Check file size before upload

5. **CORS or network issue**
   - Check Network tab in DevTools
   - Look for failed `/api/extract-pdf` request

### Testing Commands:

```powershell
# Check if OpenAI API key is valid
curl https://api.openai.com/v1/models -H "Authorization: Bearer $env:OPENAI_API_KEY"

# Test PDF extraction endpoint directly (if server is running)
# Create a test.pdf file first, then:
curl -X POST http://localhost:3000/api/extract-pdf -F "file=@test.pdf"
```

---

## ⚙️ Required NPM Packages

All of these should already be in your `package.json`:

```json
{
  "@google-cloud/vertexai": "^1.8.0",
  "openai": "^4.77.3",
  "@deepgram/sdk": "^3.10.0",
  "@supabase/supabase-js": "^2.49.1",
  "stripe": "^17.5.0",
  "resend": "^4.0.1",
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.8.0",
  "cheerio": "^1.0.0"
}
```

---

## 🚀 Quick Fix Steps

If PDF upload is not working:

1. **Check browser console** (F12)
   - Look for errors when clicking upload button

2. **Check server logs** 
   - Look at the terminal where `npm run dev` is running
   - Upload a PDF and watch for errors

3. **Verify OpenAI API key**
   - Check quota: https://platform.openai.com/usage
   - Check billing: https://platform.openai.com/settings/organization/billing

4. **Test with simple text PDF first**
   - Don't start with complex/scanned PDFs
   - Test with a basic text-only PDF

5. **Check file size**
   - Must be under 25MB

---

## 📊 API Cost Breakdown

**Per 1000 users:**
- OpenAI GPT-4o-mini: ~$0.15 (cheap for vision/OCR)
- Vertex AI Gemini 2.5 Flash: FREE tier (10M requests/month)
- Deepgram: $200 FREE credit (lasts months)
- Supabase: FREE tier (up to 50K auth users)
- Stripe: 2.9% + $0.30 per transaction
- Resend: 100 emails/day FREE

**Total typical monthly cost for PDF/audio app: < $50/month**

---

## Next Steps

1. Open browser DevTools (F12)
2. Try uploading a PDF
3. Check Console tab for errors
4. Check Network tab for failed requests
5. Send me the error message you see
