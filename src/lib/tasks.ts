// Domain helpers for the work-assignment module (B2).
//
// This module is intentionally free of runtime server-only imports so it can be
// shared by both Server and Client Components (status labels, progress maths,
// overdue checks...). Prisma/DB access lives in the server actions instead.
import { can } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/session";

export const WORK_ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SUB_TASK_STATUSES = ["NEW", "IN_PROGRESS", "PENDING_REVIEW", "DONE"] as const;
export type SubTaskStatus = (typeof SUB_TASK_STATUSES)[number];

/** Maximum size for an uploaded attachment (stored as bytea in PostgreSQL). */
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MAX_MB = Math.round(ATTACHMENT_MAX_BYTES / (1024 * 1024));

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

export function isSubTaskStatus(value: unknown): value is SubTaskStatus {
  return typeof value === "string" && (SUB_TASK_STATUSES as readonly string[]).includes(value);
}

export function isWorkOrderStatus(value: unknown): value is WorkOrderStatus {
  return typeof value === "string" && (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}

/** Priority ordering used for sorting (most urgent first). */
export function priorityRank(priority: string): number {
  const index = (PRIORITIES as readonly string[]).indexOf(priority);
  return index === -1 ? 1 : index;
}

export function isOverdue(
  dueDate: Date | string | null | undefined,
  isDone: boolean,
): boolean {
  if (!dueDate || isDone) return false;
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return date.getTime() < Date.now();
}

type SubTaskLike = { progress: number; status: string };
type TargetLike = {
  reportedAt: Date | string | null;
  subTasks: SubTaskLike[];
};

/** A target is complete when it was reported, or every sub-task is approved. */
export function isTargetComplete(target: TargetLike): boolean {
  if (target.reportedAt) return true;
  return target.subTasks.length > 0 && target.subTasks.every((task) => task.status === "DONE");
}

/** The system suggests reporting completion once all sub-tasks are approved. */
export function shouldSuggestTargetReport(target: TargetLike): boolean {
  return (
    !target.reportedAt &&
    target.subTasks.length > 0 &&
    target.subTasks.every((task) => task.status === "DONE")
  );
}

export function targetProgress(target: TargetLike): number {
  if (target.reportedAt) return 100;
  if (target.subTasks.length === 0) return 0;
  const total = target.subTasks.reduce(
    (sum, task) => sum + Math.max(0, Math.min(100, task.progress)),
    0,
  );
  return Math.round(total / target.subTasks.length);
}

export function workOrderProgress(targets: TargetLike[]): number {
  if (targets.length === 0) return 0;
  const total = targets.reduce((sum, target) => sum + targetProgress(target), 0);
  return Math.round(total / targets.length);
}

export function derivedWorkOrderStatus(
  targets: TargetLike[],
  storedStatus: string,
): WorkOrderStatus {
  if (storedStatus === "CANCELLED") return "CANCELLED";
  if (targets.length > 0 && targets.every(isTargetComplete)) return "DONE";
  const started = targets.some(
    (target) => target.reportedAt != null || target.subTasks.length > 0,
  );
  return started ? "IN_PROGRESS" : "OPEN";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Row-level visibility filter for work orders.
 *
 * - Board (task:view:company) sees everything.
 * - Department heads (task:view:department) see their department's targets,
 *   plus anything they created or are personally involved in.
 * - Staff (task:view:assigned only) see work orders that contain a sub-task
 *   assigned to them or where they collaborate.
 */
export function workOrderScope(user: CurrentUser): Prisma.WorkOrderWhereInput {
  if (can(user.role, "task:view:company")) return {};

  const assigned: Prisma.WorkOrderWhereInput = {
    targets: {
      some: {
        subTasks: {
          some: {
            OR: [
              { mainAssigneeId: user.id },
              { collaborators: { some: { userId: user.id } } },
            ],
          },
        },
      },
    },
  };

  if (can(user.role, "task:view:department")) {
    const deptId = user.headedDepartmentId ?? user.departmentId;
    if (!deptId) return { OR: [assigned, { createdById: user.id }] };
    return {
      OR: [{ targets: { some: { departmentId: deptId } } }, assigned, { createdById: user.id }],
    };
  }

  return assigned;
}

export function canViewAllWorkOrders(user: CurrentUser): boolean {
  return can(user.role, "task:view:company");
}

export function canCreateWorkOrder(user: CurrentUser): boolean {
  return can(user.role, "task:assign:company");
}

export function canAssignSubTasks(user: CurrentUser): boolean {
  return can(user.role, "task:assign:department");
}

export function canApproveSubTasks(user: CurrentUser): boolean {
  return can(user.role, "task:approve");
}

export function canFollowWorkOrder(user: CurrentUser): boolean {
  return can(user.role, "task:follow");
}

/** A department head manages sub-tasks for a target their department owns. */
export function managesTarget(
  user: CurrentUser,
  target: { departmentId: string; headId: string | null },
): boolean {
  if (!can(user.role, "task:assign:department")) return false;
  return (
    target.headId === user.id ||
    (user.headedDepartmentId != null && target.departmentId === user.headedDepartmentId) ||
    (user.headedDepartmentId == null && user.departmentId != null && target.departmentId === user.departmentId)
  );
}

/** The assignee (or a collaborator) may update progress / report completion. */
export function canWorkOnSubTask(
  user: CurrentUser,
  subTask: { mainAssigneeId: string | null; collaborators: { userId: string }[] },
): boolean {
  if (subTask.mainAssigneeId === user.id) return true;
  return subTask.collaborators.some((collaborator) => collaborator.userId === user.id);
}
