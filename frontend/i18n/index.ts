import { enMessages } from "./locales/en";
import { viMessages } from "./locales/vi";
import type { TranslationValues } from "./types";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";
export type TranslationKey = keyof typeof viMessages;
export type Translator = (key: TranslationKey, values?: TranslationValues) => string;

const catalogs: Record<Locale, Record<TranslationKey, string>> = {
  vi: viMessages,
  en: enMessages,
};

export function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "vi" ? value : DEFAULT_LOCALE;
}

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

export function resolveMessage(
  current: Record<string, string>,
  fallback: Record<string, string>,
  key: string,
  values?: TranslationValues,
): string | undefined {
  const message = current[key] ?? fallback[key];
  return message ? interpolate(message, values) : undefined;
}

export function translate(locale: Locale, key: string, values?: TranslationValues): string {
  const current = catalogs[locale] as Record<string, string>;
  const fallback = catalogs[DEFAULT_LOCALE] as Record<string, string>;
  const message = resolveMessage(current, fallback, key, values);
  if (!message) {
    if (process.env.NODE_ENV !== "production") console.warn(`[i18n] Missing translation key: ${key}`);
    return key;
  }
  return message;
}
