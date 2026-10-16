"use client";

import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useTranslations } from "@/components/i18n-provider";
import { logoutAction } from "@/server/actions/auth";
import { initials } from "@/lib/utils";

export function Header({
  name,
  email,
  roleLabel,
  departmentName,
}: {
  name: string;
  email: string;
  roleLabel: string;
  departmentName: string | null;
}) {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-[10px] font-bold tracking-tight text-primary-foreground">
          MTH
        </div>
        <span className="truncate text-sm font-semibold">{t("common.appShort")}</span>
      </div>

      <div className="hidden min-w-0 flex-col lg:flex">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{email}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <LocaleSwitcher />

        <div className="hidden items-center gap-2 sm:flex">
          <Badge variant="secondary">{roleLabel}</Badge>
          {departmentName ? <Badge variant="outline">{departmentName}</Badge> : null}
        </div>

        <Link
          href="/profile"
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          aria-label={t("nav.profile")}
        >
          {initials(name) || <UserCircle className="size-4" />}
        </Link>

        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut />
            <span className="hidden sm:inline">{t("auth.logout")}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
