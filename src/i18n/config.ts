export const locales = ["vi", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";

export const LOCALE_COOKIE = "mth_locale";

export const localeNames: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
