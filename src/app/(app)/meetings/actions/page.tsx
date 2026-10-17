import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { meetingScope } from "@/lib/meetings";
import { actionItemWorkState, isOverdue, workOrderProgress } from "@/lib/tasks";
import { can } from "@/lib/rbac";
import type { ActionItemRow } from "../types";
import { ActionsClient } from "./actions-client";

export default async function MeetingActionsPage() {
  const user = await requirePermission("meeting:view");
  const { locale } = await getTranslator();

  const items = await prisma.minuteActionItem.findMany({
    where: { meeting: meetingScope(user) },
    orderBy: [{ createdAt: "desc" }],
    include: {
      meeting: { select: { id: true, code: true, title: true, meetingDate: true } },
      department: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      workOrder: {
        select: {
          id: true,
          code: true,
          status: true,
          targets: { select: { closedAt: true, subTasks: { select: { status: true } } } },
        },
      },
    },
  });

  const rows: ActionItemRow[] = items.map((item) => {
    const converted = Boolean(item.workOrderId);
    const workState = actionItemWorkState(
      converted,
      item.workOrder?.status,
      item.workOrder?.targets ?? [],
    );
    const progress = converted ? workOrderProgress(item.workOrder?.targets ?? []) : 0;
    const workOrderCode = item.workOrder?.code ?? null;

    return {
      id: item.id,
      meetingId: item.meetingId,
      meetingCode: item.meeting.code,
      meetingTitle: item.meeting.title,
      meetingDate: item.meeting.meetingDate.toISOString(),
      title: item.title,
      description: item.description,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      departmentId: item.departmentId,
      departmentName: item.department?.name ?? null,
      assigneeId: item.assigneeId,
      assigneeName: item.assignee?.name ?? null,
      workOrderId: item.workOrderId,
      workOrderCode,
      converted,
      workState,
      progress,
      overdue: isOverdue(item.dueDate, converted),
    };
  });

  return (
    <ActionsClient
      rows={rows}
      locale={locale === "vi" ? "vi-VN" : "en-US"}
      canConvert={can(user.role, "task:assign:company")}
    />
  );
}