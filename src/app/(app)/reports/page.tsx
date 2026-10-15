import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can, canAny } from "@/lib/rbac";
import { getTranslator } from "@/i18n";
import { derivedWorkOrderStatus, workOrderProgress } from "@/lib/tasks";
import {
  buildReport,
  type DepartmentOption,
  type ReportScope,
  type ReportSubTaskRow,
  type ReportWorkOrderRow,
} from "@/lib/reports";
import { ReportsClient } from "./reports-client";

const REPORT_PERMISSIONS = ["report:company", "report:department", "report:overview"] as const;

export default async function ReportsPage() {
  const user = await requireUser();
  const { locale } = await getTranslator();

  if (!canAny(user.role, REPORT_PERMISSIONS)) {
    redirect("/dashboard");
  }

  const scope: ReportScope = can(user.role, "report:company")
    ? "company"
    : can(user.role, "report:department")
      ? "department"
      : "overview";

  // Department heads only see their own department; the board sees the whole
  // hospital; the administrator gets aggregate figures without task content.
  const departmentId =
    scope === "department" ? (user.headedDepartmentId ?? user.departmentId) : null;

  const where =
    scope === "department"
      ? departmentId
        ? { targets: { some: { departmentId } } }
        : { id: "__none__" }
      : {};

  const workOrders = await prisma.workOrder.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      targets: {
        where: scope === "department" && departmentId ? { departmentId } : undefined,
        include: {
          department: { select: { id: true, name: true } },
          subTasks: {
            orderBy: { createdAt: "asc" },
            include: { mainAssignee: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const departmentMap = new Map<string, DepartmentOption>();
  const subTaskRows: ReportSubTaskRow[] = [];
  const workOrderRows: ReportWorkOrderRow[] = [];

  for (const order of workOrders) {
    const status = derivedWorkOrderStatus(order.targets, order.status);
    const cancelled = status === "CANCELLED";

    workOrderRows.push({
      id: order.id,
      code: order.code,
      title: order.title,
      status,
      priority: order.priority,
      dueDate: order.dueDate?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      progress: workOrderProgress(order.targets),
      departmentIds: [...new Set(order.targets.map((target) => target.departmentId))],
      departmentNames: [...new Set(order.targets.map((target) => target.department.name))],
    });

    for (const target of order.targets) {
      departmentMap.set(target.departmentId, {
        id: target.departmentId,
        name: target.department.name,
      });
      if (cancelled) continue;
      for (const subTask of target.subTasks) {
        subTaskRows.push({
          id: subTask.id,
          title: subTask.title,
          status: subTask.status,
          dueDate: subTask.dueDate?.toISOString() ?? null,
          closed: target.closedAt != null,
          assigneeId: subTask.mainAssignee?.id ?? null,
          assigneeName: subTask.mainAssignee?.name ?? null,
          departmentId: target.departmentId,
          departmentName: target.department.name,
          workOrderId: order.id,
          workOrderCode: order.code,
          workOrderTitle: order.title,
          workOrderCreatedAt: order.createdAt.toISOString(),
        });
      }
    }
  }

  const departments = [...departmentMap.values()];
  const report = buildReport({ workOrders: workOrderRows, subTasks: subTaskRows, departments });
  const isOverview = scope === "overview";

  return (
    <ReportsClient
      scope={scope}
      locale={locale}
      canFilterDepartment={scope === "company"}
      departments={isOverview ? [] : departments}
      workOrders={isOverview ? [] : workOrderRows}
      subTasks={isOverview ? [] : subTaskRows}
      overviewKpi={isOverview ? report.kpi : null}
    />
  );
}
