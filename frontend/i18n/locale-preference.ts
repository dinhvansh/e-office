import { DEFAULT_LOCALE, normalizeLocale, type Locale } from ".";

export const LOCALE_STORAGE_KEY = "esign.locale";
const LOCALE_CHANGE_EVENT = "esign.locale.change";

export interface LocalePreferenceStore {
  read(): Locale;
  write(locale: Locale): void;
}

export const localStorageLocalePreference: LocalePreferenceStore = {
  read() {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  },
  write(locale) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
    }
  },
};

export function subscribeToLocalePreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
  };
}
