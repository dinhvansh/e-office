import type { Locale } from "@/i18n";

const intlLocales: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };

export function formatDateTime(value: Date | string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function formatDate(value: Date | string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocales[locale], { dateStyle: "medium" }).format(new Date(value));
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocales[locale], options).format(value);
}
