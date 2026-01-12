import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./contexts/SettingsContext";
import ThemeWrapper from "./components/ThemeWrapper";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "StudyMaxx - Turn Notes into Flashcards",
  description: "Generate flashcards from your notes instantly. Study smarter, not harder.",
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
        <SettingsProvider>
          <ThemeWrapper>
            {children}
          </ThemeWrapper>
        </SettingsProvider>
      </body>
    </html>
  );
}
