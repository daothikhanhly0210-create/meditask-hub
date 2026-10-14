// Pure, environment-agnostic i18n helpers.
//
// IMPORTANT: keep this module free of `next/headers` (or any server-only API).
// Client components import from here; the server-only helpers that read the
// locale cookie live in `@/i18n` (index.ts).
import { defaultLocale, type Locale } from "./config";
import vi from "./messages/vi";
import en from "./messages/en";

export type Messages = typeof vi;

const dictionaries: Record<Locale, Messages> = { vi, en };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export function createTranslator(locale: Locale): Translator {
  const messages = getMessages(locale);
  return (key, vars) => {
    const value = key
      .split(".")
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
        messages,
      );

    if (typeof value !== "string") {
      return key;
    }
    if (!vars) {
      return value;
    }
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      name in vars ? String(vars[name]) : `{${name}}`,
    );
  };
}
