"use client";

import { useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    // Apply theme to html element
    const root = document.documentElement;
    
    if (settings.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      root.classList.toggle("dark", settings.theme === "dark");
    }
  }, [settings.theme]);

  useEffect(() => {
    // Apply UI scale to html element
    const root = document.documentElement;
    root.classList.remove("ui-small", "ui-large");
    
    if (settings.uiScale === "small") {
      root.classList.add("ui-small");
    } else if (settings.uiScale === "large") {
      root.classList.add("ui-large");
    }
  }, [settings.uiScale]);

  return <>{children}</>;
}
