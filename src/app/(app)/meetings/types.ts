import type { MeetingStatus } from "@/lib/meetings";

export type DepartmentOption = { id: string; name: string };

export type PersonOption = { id: string; name: string; departmentId: string | null };

export type MeetingListItem = {
  id: string;
  code: string;
  title: string;
  meetingDate: string;
  status: MeetingStatus;
  location: string | null;
  participantCount: number;
  actionItemCount: number;
};

export type MeetingFormValues = {
  id: string;
  title: string;
  meetingDate: string;
  location: string | null;
  chairName: string | null;
  secretaryName: string | null;
  participantIds: string[];
  participantNames: string;
};

export type MeetingParticipantView = {
  id: string;
  userId: string | null;
  name: string;
  role: string | null;
};

export type ActionItemView = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  departmentId: string | null;
  departmentName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  workOrderId: string | null;
  workOrderCode: string | null;
  converted: boolean;
  canConvert: boolean;
  overdue: boolean;
};

export type ActionItemRow = {
  id: string;
  meetingId: string;
  meetingCode: string;
  meetingTitle: string;
  meetingDate: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  departmentId: string | null;
  departmentName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  workOrderId: string | null;
  workOrderCode: string | null;
  converted: boolean;
  workState: "UNASSIGNED" | "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW" | "DONE" | "CANCELLED";
  progress: number;
  overdue: boolean;
};

export type MinuteView = {
  summary: string | null;
  content: string;
  decisions: string | null;
  authorName: string | null;
  updatedAt: string;
} | null;

export type MeetingDetail = {
  id: string;
  code: string;
  title: string;
  meetingDate: string;
  location: string | null;
  chairName: string | null;
  secretaryName: string | null;
  status: MeetingStatus;
  createdByName: string;
  createdAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
  participants: MeetingParticipantView[];
  participantEmails: string[];
  minute: MinuteView;
  actionItems: ActionItemView[];
  canRecord: boolean;
  canApprove: boolean;
  canConvert: boolean;
  people: PersonOption[];
  departments: DepartmentOption[];
};
