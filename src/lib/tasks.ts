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

/**
 * Progress contributed by a sub-task, derived purely from its status. Staff
 * never type a percentage — the workflow itself moves the number.
 */
export const SUB_TASK_STATUS_PROGRESS: Record<SubTaskStatus, number> = {
  NEW: 0,
  IN_PROGRESS: 50,
  PENDING_REVIEW: 90,
  DONE: 100,
};

export function subTaskProgress(status: string): number {
  return isSubTaskStatus(status) ? SUB_TASK_STATUS_PROGRESS[status] : 0;
}

export function isSubTaskDone(status: string): boolean {
  return status === "DONE";
}

/** Roll up a set of sub-task statuses into a count + derived percentage. */
export function rollupProgress(statuses: string[]): {
  total: number;
  done: number;
  progress: number;
} {
  const total = statuses.length;
  if (total === 0) return { total: 0, done: 0, progress: 0 };
  const done = statuses.filter(isSubTaskDone).length;
  const totalProgress = statuses.reduce((sum, status) => sum + subTaskProgress(status), 0);
  return { total, done, progress: Math.round(totalProgress / total) };
}

type SubTaskLike = { status: string };
type TargetLike = {
  closedAt: Date | string | null;
  subTasks: SubTaskLike[];
};

/** A target is complete once every sub-task is approved, or the board closes it. */
export function isTargetComplete(target: TargetLike): boolean {
  if (target.closedAt) return true;
  return target.subTasks.length > 0 && target.subTasks.every((task) => isSubTaskDone(task.status));
}

export function targetProgress(target: TargetLike): number {
  if (target.closedAt) return 100;
  if (target.subTasks.length === 0) return 0;
  const total = target.subTasks.reduce((sum, task) => sum + subTaskProgress(task.status), 0);
  return Math.round(total / target.subTasks.length);
}

/** The work order pools every sub-task of every department (weighted by count). */
export function workOrderProgress(targets: TargetLike[]): number {
  if (targets.length === 0) return 0;
  if (targets.every(isTargetComplete)) return 100;
  const statuses = targets.flatMap((target) =>
    target.closedAt ? target.subTasks.map(() => "DONE") : target.subTasks.map((task) => task.status),
  );
  if (statuses.length === 0) return 0;
  const total = statuses.reduce((sum, status) => sum + subTaskProgress(status), 0);
  return Math.round(total / statuses.length);
}

export function derivedWorkOrderStatus(
  targets: TargetLike[],
  storedStatus: string,
): WorkOrderStatus {
  if (storedStatus === "CANCELLED") return "CANCELLED";
  if (targets.length > 0 && targets.every(isTargetComplete)) return "DONE";
  const started = targets.some(
    (target) => target.closedAt != null || target.subTasks.length > 0,
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

/**
 * Only the Board (director / secretary) may close a department that does not
 * need to be worked on, or reopen one that was closed by mistake.
 */
export function canCloseTarget(user: CurrentUser): boolean {
  return can(user.role, "task:target:close");
}
