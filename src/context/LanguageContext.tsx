import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import en from "../i18n/en.json";
import hi from "../i18n/hi.json";

export type AppLanguage = "en" | "hi";

type Dictionary = typeof en;

const DICTIONARIES: Record<AppLanguage, Dictionary> = { en, hi };
const STORAGE_KEY = "ai-teacher:preferred-language"; // UI preference only — not sensitive data.

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "hi" ? "hi" : "en";
  } catch {
    // localStorage can be unavailable (privacy mode); default safely.
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(readStoredLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Non-fatal: language preference simply won't persist across sessions.
    }
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: DICTIONARIES[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
