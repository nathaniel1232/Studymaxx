# StudyMaxx

Turn your notes into smart flashcards.

A simple tool for students: upload notes, PDFs, or paste text — get AI-generated flashcards and quiz questions in seconds.

**Status:** Beta version

## 🚀 Features

- **Smart Flashcard Generation** - AI creates flashcards from any study material
- **Multiple Input Sources** - Notes, PDFs, YouTube videos, and images (OCR)
- **Adaptive Quizzes** - Multiple-choice tests that match your target grade
- **Progress Tracking** - Lives, streaks, and mastery levels
- **Bilingual Support** - Full support for English and Norwegian
- **Local Storage** - Save your study sets without creating an account

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd studymaxx-nextjs
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: AI API Key for flashcard generation
GROQ_API_KEY=your_groq_api_key_here
```

Get your free Groq API key from: https://console.groq.com/keys

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 4. Build for Production

```bash
npm run build
npm start
```

## 📦 Deploy

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add `GROQ_API_KEY` in Vercel environment variables
4. Deploy

### Other Platforms

The app is a standard Next.js app and can be deployed on:
- Netlify
- Cloudflare Pages
- AWS Amplify
- Your own server

## 🔧 Tech Stack

- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS with custom design system
- **AI:** Groq (llama-3.3-70b-versatile)
- **Storage:** LocalStorage (with optional Supabase)
- **PDF Processing:** pdf.js
- **OCR:** Tesseract.js

## 📝 License

This project is for educational purposes.
