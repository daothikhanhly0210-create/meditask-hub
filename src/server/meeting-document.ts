import { prisma } from "@/lib/prisma";
import type { MinuteDocument } from "@/lib/export/minute-document";

/**
 * Assemble the export document for a meeting. Visibility must be checked by the
 * caller (server page or export route) before calling this.
 */
export async function loadMeetingDocument(
  meetingId: string,
  locale: string,
): Promise<MinuteDocument | null> {
  const [meeting, hospital] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        participants: {
          orderBy: { createdAt: "asc" },
          select: { name: true, role: true },
        },
        minute: {
          select: {
            summary: true,
            content: true,
            decisions: true,
            createdBy: { select: { name: true } },
          },
        },
        actionItems: {
          orderBy: { createdAt: "asc" },
          select: {
            title: true,
            description: true,
            dueDate: true,
            department: { select: { name: true } },
            assignee: { select: { name: true } },
            workOrder: { select: { code: true } },
          },
        },
      },
    }),
    prisma.setting.findUnique({ where: { key: "company.name" }, select: { value: true } }),
  ]);

  if (!meeting) return null;

  return {
    hospitalName: hospital?.value ?? "Bệnh viện",
    code: meeting.code,
    title: meeting.title,
    meetingDate: meeting.meetingDate.toISOString(),
    location: meeting.location,
    chairName: meeting.chairName,
    secretaryName: meeting.secretaryName,
    status: meeting.status,
    participants: meeting.participants.map((participant) => ({
      name: participant.name,
      role: participant.role,
    })),
    summary: meeting.minute?.summary ?? null,
    content: meeting.minute?.content ?? "",
    decisions: meeting.minute?.decisions ?? null,
    actionItems: meeting.actionItems.map((item) => ({
      title: item.title,
      description: item.description,
      departmentName: item.department?.name ?? null,
      assigneeName: item.assignee?.name ?? null,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      workOrderCode: item.workOrder?.code ?? null,
    })),
    authorName: meeting.minute?.createdBy.name ?? meeting.createdBy.name,
    approvedByName: meeting.approvedBy?.name ?? null,
    approvedAt: meeting.approvedAt ? meeting.approvedAt.toISOString() : null,
    locale,
  };
}
