import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { canRecordMeetings, isMeetingStatus, meetingScope } from "@/lib/meetings";
import { MeetingsClient } from "./meetings-client";
import type { MeetingListItem } from "./types";

export default async function MeetingsPage() {
  const user = await requirePermission("meeting:view");
  const { locale } = await getTranslator();

  const [meetings, people] = await Promise.all([
    prisma.meeting.findMany({
      where: meetingScope(user),
      orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        code: true,
        title: true,
        meetingDate: true,
        status: true,
        location: true,
        _count: { select: { participants: true, actionItems: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, departmentId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: MeetingListItem[] = meetings.map((meeting) => ({
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    meetingDate: meeting.meetingDate.toISOString(),
    status: isMeetingStatus(meeting.status) ? meeting.status : "DRAFT",
    location: meeting.location,
    participantCount: meeting._count.participants,
    actionItemCount: meeting._count.actionItems,
  }));

  return (
    <MeetingsClient
      meetings={rows}
      people={people}
      canRecord={canRecordMeetings(user)}
      locale={locale === "vi" ? "vi-VN" : "en-US"}
    />
  );
}
