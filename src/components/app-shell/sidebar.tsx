"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "./nav-config";
import { useTranslations } from "@/components/i18n-provider";
import { asRole, canAny, type Permission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const roleValue = asRole(role);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          HR
        </div>
        <span className="truncate text-sm font-semibold">{t("common.appName")}</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => {
            if (!item.permission) return true;
            const required = Array.isArray(item.permission)
              ? item.permission
              : [item.permission as Permission];
            return canAny(roleValue, required);
          });
          if (items.length === 0) return null;

          return (
            <div key={group.key} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(group.key)}
              </p>
              {items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="truncate">{t(item.key)}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
