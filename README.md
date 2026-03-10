# StudyMaxx

AI-powered study platform with flashcard generation, document summarization, math tutoring, and audio transcription. Built with Next.js 16, Supabase, and Stripe. Deployed on Vercel.

Live at [studymaxx.com](https://studymaxx.com)

## Features

**Core**
- AI flashcard generation from text, documents (PDF, DOCX, PPTX, images), audio recordings, websites, and YouTube videos
- Study modes: classic flashcards, match game, quiz
- Document summarizer with structured output
- Notes editor with auto-save
- Spaced repetition and streak tracking

**MathMaxx**
- AI math tutor (chat interface) powered by Gemini 2.5 Flash
- Math quiz generator by topic and difficulty
- KaTeX rendering for equations
- Server-side computation via math.js for answer verification

**Premium ($5.99/mo)**
- Unlimited flashcard sets and cards per set
- Unlimited document uploads and summarization
- Unlimited MathMaxx usage
- Free users get limited daily usage with trial access to premium features

**Other**
- Google OAuth login via Supabase Auth
- Onboarding quiz with personalized study plans
- Folder organization for flashcard sets
- Shareable study sets via public links
- User profiles with avatars
- Streak reminders via email (Resend)
- Dark/light theme
- Multi-language support (50+ languages)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe (Checkout, Webhooks, Customer Portal) |
| AI - Chat/Math/Summarization | Google Vertex AI (Gemini 2.5 Flash) |
| AI - Transcription | OpenAI Whisper + Deepgram (fallback) |
| OCR | Tesseract.js |
| PDF | pdf-parse, pdfjs-dist, pdf-lib |
| Email | Resend |
| Hosting | Vercel |
| Analytics | Vercel Analytics |

## Project Structure

```
app/
  api/              # 28 API routes (auth, chat, stripe, transcribe, etc.)
  components/       # React components (dashboard, views, modals, widgets)
  contexts/         # React context providers (settings, auth)
  utils/            # Shared utilities (supabase, premium, rate limiting, etc.)
  page.tsx          # Main SPA entry point
  layout.tsx        # Root layout
middleware.ts       # Supabase session refresh
vercel.json         # Cron jobs config
```

## Environment Variables

Set these in Vercel (or `.env.local` for local dev):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_ID=

# Google Vertex AI
GOOGLE_CLOUD_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS_JSON=
VERTEX_AI_PROJECT_ID=

# OpenAI (Whisper audio transcription only)
OPENAI_API_KEY=

# Deepgram
DEEPGRAM_API_KEY=

# Resend (email)
RESEND_API_KEY=

# App
NEXT_PUBLIC_BASE_URL=
CRON_SECRET=
```

## Cron Jobs

Configured in `vercel.json`, secured with `CRON_SECRET`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/sync-stripe` | Daily 2 AM UTC | Sync Stripe subscription status to database |
| `/api/cron/expire-premium` | Daily 1 AM UTC | Expire lapsed premium subscriptions |
| `/api/cron/streak-reminder` | Daily 6 PM UTC | Send streak reminder emails |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles, premium status, settings |
| `flashcard_sets` | Generated flashcard sets with cards |
| `folders` | Folder organization for sets |
| `summaries` | Saved document summaries |
| `study_plans` | AI-generated study plans |
| `user_documents` | Notes editor documents |
| `feedback` | User feedback |
| `problem_reports` | Bug reports |

## Local Development

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`. Requires all environment variables to be set in `.env.local`.

## Deployment

Push to `main` branch. Vercel auto-deploys.

## Stripe Webhook

Point your Stripe webhook endpoint to `https://yourdomain.com/api/stripe/webhook` and listen for:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`
- `customer.subscription.updated`
