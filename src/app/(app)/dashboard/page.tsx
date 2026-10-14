import { Building2, ShieldCheck, UserCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function DashboardPage() {
  const user = await requireUser();
  const { t } = await getTranslator();

  const canManageUsers = can(user.role, "user:manage");
  const stats = canManageUsers
    ? await Promise.all([
        prisma.user.count(),
        prisma.department.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
      ])
    : null;

  const cards = stats
    ? [
        { key: "dashboard.statUsers", value: stats[0], icon: Users },
        { key: "dashboard.statDepartments", value: stats[1], icon: Building2 },
        { key: "dashboard.statActive", value: stats[2], icon: UserCheck },
        { key: "dashboard.statLocked", value: stats[3], icon: ShieldCheck },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboard.greeting", { name: user.name })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.accountInfo")}</CardTitle>
          <CardDescription>{t("dashboard.roleLabel")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge>{t(`roles.${user.role}`)}</Badge>
          {user.departmentName ? (
            <Badge variant="outline">{user.departmentName}</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              {t("dashboard.noDepartment")}
            </Badge>
          )}
          {user.jobTitle ? <Badge variant="secondary">{user.jobTitle}</Badge> : null}
        </CardContent>
      </Card>

      {cards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t(card.key)}</p>
                    <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Alert variant="default">
        <ShieldCheck />
        <AlertDescription>{t("dashboard.phaseNotice")}</AlertDescription>
      </Alert>
    </div>
  );
}
