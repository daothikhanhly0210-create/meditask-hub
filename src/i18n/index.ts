// Server-only i18n entry point.
//
// Client components must NOT import this module (it pulls in `next/headers`).
// They should import from `@/i18n/translator` instead.
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { createTranslator, type Translator } from "./translator";

export type { Messages, Translator } from "./translator";
export { createTranslator, getMessages } from "./translator";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getTranslator(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
