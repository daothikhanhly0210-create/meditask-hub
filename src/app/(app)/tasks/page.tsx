import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import {
  canCreateWorkOrder,
  derivedWorkOrderStatus,
  isPriority,
  workOrderProgress,
  workOrderScope,
} from "@/lib/tasks";
import { TasksClient } from "./tasks-client";
import type { DepartmentOption, WorkOrderListItem } from "./types";

export default async function TasksPage() {
  const user = await requirePermission("task:view");
  const { locale } = await getTranslator();

  const [workOrders, departments] = await Promise.all([
    prisma.workOrder.findMany({
      where: workOrderScope(user),
      orderBy: [{ createdAt: "desc" }],
      include: {
        createdBy: { select: { name: true } },
        targets: {
          select: {
            department: { select: { name: true } },
            closedAt: true,
            subTasks: { select: { status: true } },
          },
        },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: WorkOrderListItem[] = workOrders.map((workOrder) => {
    const targets = workOrder.targets.map((target) => ({
      closedAt: target.closedAt,
      subTasks: target.subTasks,
    }));
    return {
      id: workOrder.id,
      code: workOrder.code,
      title: workOrder.title,
      status: derivedWorkOrderStatus(targets, workOrder.status),
      priority: isPriority(workOrder.priority) ? workOrder.priority : "NORMAL",
      dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
      progress: workOrderProgress(targets),
      departmentNames: workOrder.targets.map((target) => target.department.name),
      createdByName: workOrder.createdBy.name,
      createdAt: workOrder.createdAt.toISOString(),
    };
  });

  const departmentOptions: DepartmentOption[] = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <TasksClient
        workOrders={rows}
        departments={departmentOptions}
        canCreate={canCreateWorkOrder(user)}
        locale={locale === "vi" ? "vi-VN" : "en-US"}
      />
    </div>
  );
}
