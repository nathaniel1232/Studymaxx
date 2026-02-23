import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "600", "700"], // Reduced from 5 to 3 weights for faster loading
  display: "swap", // Show fallback text immediately while font loads
});

export const metadata: Metadata = {
  title: "StudyMaxx - Turn Notes into Flashcards in Seconds",
  description: "Paste your notes, upload a PDF, or drop a YouTube link — StudyMaxx creates flashcards, quizzes, and study games instantly with AI. Used by 2,000+ students.",
  openGraph: {
    title: "StudyMaxx - Turn Notes into Flashcards in Seconds",
    description: "Paste notes, upload a PDF or YouTube link → AI creates flashcards, quizzes & games. Free to start.",
    siteName: "StudyMaxx",
    type: "website",
    url: "https://studymaxx.net",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyMaxx - Turn Notes into Flashcards in Seconds",
    description: "Paste notes, upload a PDF or YouTube link → AI creates flashcards, quizzes & games. Free to start.",
  },
  keywords: ["flashcards", "study", "AI flashcards", "quizlet alternative", "study tool", "flashcard maker", "AI study", "exam prep"],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${outfit.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
