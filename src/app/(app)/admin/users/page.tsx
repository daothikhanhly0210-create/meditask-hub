import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { asRole } from "@/lib/rbac";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UsersClient } from "./users-client";
import type { DepartmentOption, UserRow } from "./types";

export default async function AdminUsersPage() {
  const actor = await requirePermission("user:manage");
  const { t, locale } = await getTranslator();

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { department: { select: { id: true, name: true } } },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: asRole(user.role),
    isActive: user.isActive,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
    jobTitle: user.jobTitle,
    phone: user.phone,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  }));

  const departmentOptions: DepartmentOption[] = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.usersTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.usersSubtitle")}</p>
      </div>

      {departmentOptions.length === 0 ? (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertDescription>{t("admin.noDepartmentsYet")}</AlertDescription>
        </Alert>
      ) : null}

      <UsersClient
        users={rows}
        departments={departmentOptions}
        currentUserId={actor.id}
        locale={locale === "vi" ? "vi-VN" : "en-US"}
      />
    </div>
  );
}
