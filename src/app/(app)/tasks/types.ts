import type { WorkOrderStatus } from "@/lib/tasks";

export type DepartmentOption = { id: string; name: string };

export type PersonRef = { id: string; name: string };

export type WorkOrderListItem = {
  id: string;
  code: string;
  title: string;
  status: WorkOrderStatus;
  priority: string;
  dueDate: string | null;
  progress: number;
  departmentNames: string[];
  createdByName: string;
  createdAt: string;
};

export type CommentItem = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

export type AttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
};

export type SubTaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  mainAssignee: { id: string; name: string } | null;
  collaborators: { id: string; name: string }[];
  createdByName: string;
  rejectReason: string | null;
  overdue: boolean;
  comments: CommentItem[];
  attachments: AttachmentItem[];
  canWork: boolean;
  canManage: boolean;
};

export type TargetItem = {
  id: string;
  departmentId: string;
  departmentName: string;
  head: PersonRef | null;
  progress: number;
  complete: boolean;
  closedAt: string | null;
  closedReason: string | null;
  closedByName: string | null;
  canClose: boolean;
  canViewProgress: boolean;
  canManage: boolean;
  members: { id: string; name: string }[];
  subTasks: SubTaskItem[];
};

export type WorkOrderDetail = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  overdue: boolean;
  createdBy: PersonRef;
  createdAt: string;
  targets: TargetItem[];
  followers: { id: string; name: string }[];
  followerOptions: { id: string; name: string }[];
  departmentOptions: DepartmentOption[];
  comments: CommentItem[];
  attachments: AttachmentItem[];
  canManageWorkOrder: boolean;
  canFollow: boolean;
  currentUserId: string;
};

export type MySubTaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  overdue: boolean;
  workOrderId: string;
  workOrderCode: string;
  workOrderTitle: string;
  departmentName: string;
  mainAssigneeName: string | null;
  canApprove: boolean;
  canWork: boolean;
};
