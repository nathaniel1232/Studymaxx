import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "StudyMaxx - Turn Notes into Flashcards",
  description: "Generate flashcards from your notes instantly. Study smarter, not harder.",
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
