import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import {
  canApproveMeetings,
  canRecordMeetings,
  isMeetingStatus,
  meetingScope,
} from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { isOverdue } from "@/lib/tasks";
import { DetailClient } from "./detail-client";
import type { ActionItemView, MeetingDetail } from "../types";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("meeting:view");
  const { locale } = await getTranslator();

  const meeting = await prisma.meeting.findFirst({
    where: { AND: [{ id }, meetingScope(user)] },
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      participants: {
        orderBy: { createdAt: "asc" },
        select: { id: true, userId: true, name: true, role: true },
      },
      minute: {
        select: {
          summary: true,
          content: true,
          decisions: true,
          updatedAt: true,
          createdBy: { select: { name: true } },
        },
      },
      actionItems: {
        orderBy: { createdAt: "asc" },
        include: {
          department: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          workOrder: { select: { id: true, code: true } },
        },
      },
    },
  });

  if (!meeting) notFound();

  const participantUserIds = meeting.participants
    .map((participant) => participant.userId)
    .filter((value): value is string => Boolean(value));

  const [people, departments, participantUsers] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, departmentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    participantUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: participantUserIds } },
          select: { id: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const emailByUserId = new Map(participantUsers.map((entry) => [entry.id, entry.email]));
  const participantEmails = participantUserIds
    .map((userId) => emailByUserId.get(userId))
    .filter((value): value is string => Boolean(value));

  const actionItems: ActionItemView[] = meeting.actionItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    departmentId: item.departmentId,
    departmentName: item.department?.name ?? null,
    assigneeId: item.assigneeId,
    assigneeName: item.assignee?.name ?? null,
    workOrderId: item.workOrder?.id ?? null,
    workOrderCode: item.workOrder?.code ?? null,
    converted: Boolean(item.workOrderId),
    canConvert: can(user.role, "task:assign:company"),
    overdue: isOverdue(item.dueDate, Boolean(item.workOrderId)),
  }));

  const detail: MeetingDetail = {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    meetingDate: meeting.meetingDate.toISOString(),
    location: meeting.location,
    chairName: meeting.chairName,
    secretaryName: meeting.secretaryName,
    status: isMeetingStatus(meeting.status) ? meeting.status : "DRAFT",
    createdByName: meeting.createdBy.name,
    createdAt: meeting.createdAt.toISOString(),
    approvedByName: meeting.approvedBy?.name ?? null,
    approvedAt: meeting.approvedAt ? meeting.approvedAt.toISOString() : null,
    participants: meeting.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      name: participant.name,
      role: participant.role,
    })),
    participantEmails,
    minute: meeting.minute
      ? {
          summary: meeting.minute.summary,
          content: meeting.minute.content,
          decisions: meeting.minute.decisions,
          authorName: meeting.minute.createdBy.name,
          updatedAt: meeting.minute.updatedAt.toISOString(),
        }
      : null,
    actionItems,
    canRecord: canRecordMeetings(user),
    canApprove: canApproveMeetings(user),
    canConvert: can(user.role, "task:assign:company"),
    people,
    departments,
  };

  return <DetailClient meeting={detail} locale={locale === "vi" ? "vi-VN" : "en-US"} />;
}
