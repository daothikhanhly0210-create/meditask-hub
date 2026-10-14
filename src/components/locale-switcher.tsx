"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";
import { setLocaleAction } from "@/server/actions/locale";

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label={t("language.label")}
      value={locale}
      disabled={pending}
      className="h-8 w-36 text-xs"
      onChange={(event) => {
        const next = event.target.value as Locale;
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        });
      }}
    >
      {locales.map((value) => (
        <option key={value} value={value}>
          {localeNames[value]}
        </option>
      ))}
    </Select>
  );
}
