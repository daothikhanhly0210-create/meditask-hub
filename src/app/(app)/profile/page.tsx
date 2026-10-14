import { requireUser } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";
import { formatDateTime, initials } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await requireUser();
  const { t, locale } = await getTranslator();
  const intlLocale = locale === "vi" ? "vi-VN" : "en-US";

  const rows: Array<{ label: string; value: string }> = [
    { label: t("fields.fullName"), value: user.name },
    { label: t("fields.email"), value: user.email },
    { label: t("fields.role"), value: t(`roles.${user.role}`) },
    { label: t("fields.department"), value: user.departmentName ?? t("dashboard.noDepartment") },
    { label: t("fields.jobTitle"), value: user.jobTitle ?? t("common.none") },
    { label: t("fields.phone"), value: user.phone ?? t("common.none") },
    { label: t("profile.lastLogin"), value: formatDateTime(user.lastLoginAt, intlLocale) },
    { label: t("profile.memberSince"), value: formatDateTime(user.createdAt, intlLocale) },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials(user.name)}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate">{user.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge>
              {user.departmentName ? <Badge variant="outline">{user.departmentName}</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}
