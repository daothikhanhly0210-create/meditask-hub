// Domain helpers for the meetings & minutes module (B4).
//
// Kept free of server-only imports so both Server and Client Components can
// share statuses, labels and visibility rules. Database access lives in
// `src/server/actions/meetings.ts`.
import { can } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/session";

export const MEETING_STATUSES = ["DRAFT", "MINUTED", "APPROVED"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export function isMeetingStatus(value: unknown): value is MeetingStatus {
  return typeof value === "string" && (MEETING_STATUSES as readonly string[]).includes(value);
}

/** The secretary (and board) maintain meetings and their minutes. */
export function canRecordMeetings(user: CurrentUser): boolean {
  return can(user.role, "meeting:record");
}

/** Only the board signs off on a finished minute. */
export function canApproveMeetings(user: CurrentUser): boolean {
  return can(user.role, "meeting:approve");
}

/** True when the user may browse every meeting, not just the ones they attend. */
export function canViewAllMeetings(user: CurrentUser): boolean {
  return (
    can(user.role, "meeting:record") ||
    can(user.role, "meeting:approve") ||
    can(user.role, "report:company")
  );
}

/** Action items already turned into a work order are locked from re-conversion. */
export function isActionItemConverted(item: { workOrderId: string | null }): boolean {
  return Boolean(item.workOrderId);
}

/**
 * Row-level visibility filter for meetings.
 *
 * - Secretary / board see every meeting.
 * - Everyone else sees meetings they attend, that assign them an action item,
 *   or that assign an action item to their department.
 */
export function meetingScope(user: CurrentUser): Prisma.MeetingWhereInput {
  if (canViewAllMeetings(user)) return {};

  const departmentId = user.headedDepartmentId ?? user.departmentId;
  const or: Prisma.MeetingWhereInput[] = [
    { participants: { some: { userId: user.id } } },
    { actionItems: { some: { assigneeId: user.id } } },
  ];
  if (departmentId) {
    or.push({ actionItems: { some: { departmentId } } });
  }
  return { OR: or };
}
