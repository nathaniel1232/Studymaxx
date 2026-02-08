"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "../contexts/SettingsContext";
import { PersonalizationProvider } from "../contexts/PersonalizationContext";
import ThemeWrapper from "./ThemeWrapper";
import CookieConsent from "./CookieConsent";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SettingsProvider>
      <PersonalizationProvider>
        <ThemeWrapper>
          {children}
          <CookieConsent />
        </ThemeWrapper>
      </PersonalizationProvider>
    </SettingsProvider>
  );
}

