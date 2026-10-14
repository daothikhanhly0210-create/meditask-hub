import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { DepartmentsClient } from "./departments-client";
import type { DepartmentRow, UserOption } from "./types";

export default async function AdminDepartmentsPage() {
  await requirePermission("department:manage");
  const { t } = await getTranslator();

  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        head: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: DepartmentRow[] = departments.map((department) => ({
    id: department.id,
    name: department.name,
    nameEn: department.nameEn,
    code: department.code,
    description: department.description,
    headId: department.headId,
    headName: department.head?.name ?? null,
    memberCount: department._count.users,
  }));

  const userOptions: UserOption[] = users.map((user) => ({ id: user.id, name: user.name }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.departmentsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.departmentsSubtitle")}</p>
      </div>

      <DepartmentsClient departments={rows} users={userOptions} />
    </div>
  );
}
