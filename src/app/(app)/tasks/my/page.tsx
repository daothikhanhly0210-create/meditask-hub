import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import {
  canApproveSubTasks,
  canWorkOnSubTask,
  isOverdue,
  isPriority,
  isSubTaskStatus,
  managesTarget,
  subTaskProgress,
} from "@/lib/tasks";
import type { Prisma } from "@prisma/client";
import { MyWorkClient } from "./my-work-client";
import type { MySubTaskItem } from "../types";

export default async function MyWorkPage() {
  const user = await requirePermission("task:view");
  const { locale } = await getTranslator();

  const deptId = user.headedDepartmentId ?? user.departmentId;
  const canApprove = canApproveSubTasks(user);

  const where: Prisma.SubTaskWhereInput = {
    OR: [
      { mainAssigneeId: user.id },
      { collaborators: { some: { userId: user.id } } },
      ...(canApprove && deptId ? [{ target: { departmentId: deptId } }] : []),
    ],
  };

  const subTasks = await prisma.subTask.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      target: {
        select: {
          departmentId: true,
          headId: true,
          department: { select: { name: true } },
          workOrder: { select: { id: true, code: true, title: true } },
        },
      },
      mainAssignee: { select: { id: true, name: true } },
      collaborators: { select: { userId: true } },
    },
  });

  const rows: MySubTaskItem[] = subTasks.map((subTask) => ({
    id: subTask.id,
    title: subTask.title,
    status: isSubTaskStatus(subTask.status) ? subTask.status : "NEW",
    priority: isPriority(subTask.priority) ? subTask.priority : "NORMAL",
    progress: subTaskProgress(subTask.status),
    dueDate: subTask.dueDate ? subTask.dueDate.toISOString() : null,
    overdue: isOverdue(subTask.dueDate, subTask.status === "DONE"),
    workOrderId: subTask.target.workOrder.id,
    workOrderCode: subTask.target.workOrder.code,
    workOrderTitle: subTask.target.workOrder.title,
    departmentName: subTask.target.department.name,
    mainAssigneeName: subTask.mainAssignee?.name ?? null,
    canApprove,
    canWork: canWorkOnSubTask(user, subTask) || managesTarget(user, subTask.target),
  }));

  return <MyWorkClient items={rows} locale={locale === "vi" ? "vi-VN" : "en-US"} />;
}
