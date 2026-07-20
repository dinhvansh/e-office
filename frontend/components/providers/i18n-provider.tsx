"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, normalizeLocale, translate, type Locale, type Translator } from "@/i18n";
import { localStorageLocalePreference, subscribeToLocalePreference } from "@/i18n/locale-preference";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocalePreference,
    localStorageLocalePreference.read,
    () => DEFAULT_LOCALE,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalized = normalizeLocale(nextLocale);
    localStorageLocalePreference.write(normalized);
  }, []);

  const t = useCallback<Translator>((key, values) => translate(locale, key, values), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
