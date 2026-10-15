"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, type CurrentUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import {
  commentSchema,
  progressSchema,
  rejectSubTaskSchema,
  subTaskSchema,
  toFieldErrors,
  workOrderSchema,
} from "@/lib/validation";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import {
  ATTACHMENT_MAX_BYTES,
  canWorkOnSubTask,
  derivedWorkOrderStatus,
  managesTarget,
  workOrderScope,
} from "@/lib/tasks";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2025"
  );
}

function revalidateWorkOrder(workOrderId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/tasks/my");
  if (workOrderId) revalidatePath(`/tasks/${workOrderId}`);
}

async function requireTaskUser(): Promise<CurrentUser> {
  return requirePermission("task:view");
}

/** Fetch a work order only if the current user is allowed to see it. */
async function loadVisibleWorkOrder(user: CurrentUser, workOrderId: string) {
  return prisma.workOrder.findFirst({
    where: { AND: [{ id: workOrderId }, workOrderScope(user)] },
    select: { id: true, createdById: true, status: true },
  });
}

async function loadSubTaskContext(subTaskId: string) {
  return prisma.subTask.findUnique({
    where: { id: subTaskId },
    include: {
      collaborators: { select: { userId: true } },
      target: {
        select: { id: true, departmentId: true, headId: true, workOrderId: true },
      },
    },
  });
}

/** Generate the next human code, e.g. PGV-2026-001 (per-year sequence). */
async function nextWorkOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PGV-${year}-`;
  // Scan this year's codes and take the numeric maximum: robust against
  // deletions and against 4-digit sequences sorting oddly as strings.
  const rows = await tx.workOrder.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  let max = 0;
  for (const row of rows) {
    const parsed = Number.parseInt(row.code.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/**
 * Persist the derived work-order status. Called after every mutation that can
 * move progress so `/tasks` filtering stays accurate.
 */
async function recomputeWorkOrderStatus(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      status: true,
      targets: {
        select: {
          reportedAt: true,
          subTasks: { select: { progress: true, status: true } },
        },
      },
    },
  });
  if (!workOrder) return;

  const targets = workOrder.targets.map((target) => ({
    reportedAt: target.reportedAt,
    subTasks: target.subTasks,
  }));
  const next = derivedWorkOrderStatus(targets, workOrder.status);
  if (next === workOrder.status) return;

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: next, closedAt: next === "DONE" ? new Date() : null },
  });
}

// ---------------------------------------------------------------------------
// Work orders (phiếu giao việc) — Board / Secretary
// ---------------------------------------------------------------------------

export async function createWorkOrderAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:company");

  const parsed = workOrderSchema.safeParse({
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    priority: readText(formData, "priority") || "NORMAL",
    dueDate: readText(formData, "dueDate"),
    departmentIds: readList(formData, "departmentIds"),
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { title, description, priority, departmentIds } = parsed.data;
  const dueDate = parseDueDate(parsed.data.dueDate);

  const departments = await prisma.department.findMany({
    where: { id: { in: departmentIds } },
    select: { id: true, headId: true },
  });
  if (departments.length === 0) {
    return errorState("validation.departmentRequired", { departmentIds: ["validation.departmentRequired"] });
  }

  try {
    let created: { id: string } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const code = await nextWorkOrderCode(tx);
          const workOrder = await tx.workOrder.create({
            data: {
              code,
              title,
              description,
              priority,
              dueDate,
              status: "OPEN",
              createdById: actor.id,
              targets: {
                create: departments.map((department) => ({
                  departmentId: department.id,
                  headId: department.headId,
                })),
              },
            },
            select: { id: true },
          });
          return workOrder;
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 4) continue;
        throw error;
      }
    }

    if (!created) return errorState("messages.actionFailed");

    await recordAudit({
      actorId: actor.id,
      action: "work_order.create",
      entity: "WorkOrder",
      entityId: created.id,
      meta: { title, departments: departments.length },
    });
    revalidateWorkOrder(created.id);
    return successState("messages.workOrderCreated");
  } catch (error) {
    console.error("[tasks] create work order failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function updateWorkOrderAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:company");
  const workOrderId = readText(formData, "workOrderId");
  if (!workOrderId) return errorState("messages.invalidData");

  const parsed = workOrderSchema.safeParse({
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    priority: readText(formData, "priority") || "NORMAL",
    dueDate: readText(formData, "dueDate"),
    departmentIds: readList(formData, "departmentIds"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const existing = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { id: true, targets: { select: { departmentId: true } } },
  });
  if (!existing) return errorState("errors.generic");

  const { title, description, priority, departmentIds } = parsed.data;
  const dueDate = parseDueDate(parsed.data.dueDate);

  const departments = await prisma.department.findMany({
    where: { id: { in: departmentIds } },
    select: { id: true, headId: true },
  });
  if (departments.length === 0) {
    return errorState("validation.departmentRequired", {
      departmentIds: ["validation.departmentRequired"],
    });
  }

  const keptIds = departments.map((department) => department.id);
  const existingIds = new Set(existing.targets.map((target) => target.departmentId));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { title, description, priority, dueDate },
      });

      // Remove targets the board de-selected, but never delete work that has
      // already been broken down into sub-tasks.
      await tx.workOrderTarget.deleteMany({
        where: {
          workOrderId,
          departmentId: { notIn: keptIds },
          subTasks: { none: {} },
        },
      });

      for (const department of departments) {
        if (existingIds.has(department.id)) continue;
        await tx.workOrderTarget.create({
          data: { workOrderId, departmentId: department.id, headId: department.headId },
        });
      }
    });

    await recordAudit({
      actorId: actor.id,
      action: "work_order.update",
      entity: "WorkOrder",
      entityId: workOrderId,
      meta: { title },
    });
    await recomputeWorkOrderStatus(workOrderId);
    revalidateWorkOrder(workOrderId);
    return successState("messages.workOrderUpdated");
  } catch (error) {
    console.error("[tasks] update work order failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function cancelWorkOrderAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:company");
  const workOrderId = readText(formData, "workOrderId");
  if (!workOrderId) return errorState("messages.invalidData");

  try {
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: "CANCELLED", closedAt: new Date() },
    });
    await recordAudit({
      actorId: actor.id,
      action: "work_order.cancel",
      entity: "WorkOrder",
      entityId: workOrderId,
    });
    revalidateWorkOrder(workOrderId);
    return successState("messages.workOrderCancelled");
  } catch (error) {
    if (isNotFound(error)) return errorState("errors.generic");
    console.error("[tasks] cancel work order failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function addFollowerAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:follow");
  const workOrderId = readText(formData, "workOrderId");
  const userId = readText(formData, "userId");
  if (!workOrderId || !userId) return errorState("messages.invalidData");

  try {
    await prisma.workOrderFollower.create({ data: { workOrderId, userId } });
    await recordAudit({
      actorId: actor.id,
      action: "work_order.follow",
      entity: "WorkOrder",
      entityId: workOrderId,
      meta: { userId },
    });
    revalidateWorkOrder(workOrderId);
    return successState("messages.followerAdded");
  } catch (error) {
    if (isUniqueViolation(error)) return successState("messages.followerAdded");
    console.error("[tasks] add follower failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function removeFollowerAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:follow");
  const workOrderId = readText(formData, "workOrderId");
  const userId = readText(formData, "userId");
  if (!workOrderId || !userId) return errorState("messages.invalidData");

  try {
    await prisma.workOrderFollower.deleteMany({ where: { workOrderId, userId } });
    await recordAudit({
      actorId: actor.id,
      action: "work_order.unfollow",
      entity: "WorkOrder",
      entityId: workOrderId,
      meta: { userId },
    });
    revalidateWorkOrder(workOrderId);
    return successState("messages.followerRemoved");
  } catch (error) {
    console.error("[tasks] remove follower failed", error);
    return errorState("messages.actionFailed");
  }
}

// ---------------------------------------------------------------------------
// Sub-tasks — Department heads
// ---------------------------------------------------------------------------

async function resolveDepartmentMemberIds(departmentId: string): Promise<Set<string>> {
  const members = await prisma.user.findMany({
    where: { departmentId, isActive: true },
    select: { id: true },
  });
  return new Set(members.map((member) => member.id));
}

export async function createSubTaskAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:department");

  const parsed = subTaskSchema.safeParse({
    targetId: readText(formData, "targetId"),
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    priority: readText(formData, "priority") || "NORMAL",
    dueDate: readText(formData, "dueDate"),
    mainAssigneeId: readText(formData, "mainAssigneeId"),
    collaboratorIds: readList(formData, "collaboratorIds"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const target = await prisma.workOrderTarget.findUnique({
    where: { id: parsed.data.targetId },
    select: { id: true, departmentId: true, headId: true, workOrderId: true },
  });
  if (!target) return errorState("errors.generic");
  if (!managesTarget(actor, target)) return errorState("messages.forbidden");

  const members = await resolveDepartmentMemberIds(target.departmentId);
  const mainAssigneeId =
    parsed.data.mainAssigneeId && members.has(parsed.data.mainAssigneeId)
      ? parsed.data.mainAssigneeId
      : null;
  const collaboratorIds = parsed.data.collaboratorIds.filter(
    (id) => members.has(id) && id !== mainAssigneeId,
  );

  try {
    await prisma.subTask.create({
      data: {
        targetId: target.id,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        dueDate: parseDueDate(parsed.data.dueDate),
        status: "NEW",
        progress: 0,
        mainAssigneeId,
        createdById: actor.id,
        collaborators: {
          create: collaboratorIds.map((userId) => ({ userId })),
        },
      },
    });

    await recordAudit({
      actorId: actor.id,
      action: "sub_task.create",
      entity: "SubTask",
      meta: { targetId: target.id, title: parsed.data.title },
    });
    await recomputeWorkOrderStatus(target.workOrderId);
    revalidateWorkOrder(target.workOrderId);
    return successState("messages.subTaskCreated");
  } catch (error) {
    console.error("[tasks] create sub-task failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function updateSubTaskAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:department");
  const subTaskId = readText(formData, "subTaskId");
  if (!subTaskId) return errorState("messages.invalidData");

  const parsed = subTaskSchema.safeParse({
    targetId: readText(formData, "targetId"),
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    priority: readText(formData, "priority") || "NORMAL",
    dueDate: readText(formData, "dueDate"),
    mainAssigneeId: readText(formData, "mainAssigneeId"),
    collaboratorIds: readList(formData, "collaboratorIds"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const existing = await prisma.subTask.findUnique({
    where: { id: subTaskId },
    include: { target: { select: { id: true, departmentId: true, headId: true, workOrderId: true } } },
  });
  if (!existing) return errorState("errors.generic");
  if (!managesTarget(actor, existing.target)) return errorState("messages.forbidden");

  const members = await resolveDepartmentMemberIds(existing.target.departmentId);
  const mainAssigneeId =
    parsed.data.mainAssigneeId && members.has(parsed.data.mainAssigneeId)
      ? parsed.data.mainAssigneeId
      : null;
  const collaboratorIds = parsed.data.collaboratorIds.filter(
    (id) => members.has(id) && id !== mainAssigneeId,
  );

  try {
    await prisma.$transaction([
      prisma.subTaskCollaborator.deleteMany({ where: { subTaskId } }),
      prisma.subTask.update({
        where: { id: subTaskId },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          priority: parsed.data.priority,
          dueDate: parseDueDate(parsed.data.dueDate),
          mainAssigneeId,
          collaborators: { create: collaboratorIds.map((userId) => ({ userId })) },
        },
      }),
    ]);

    await recordAudit({
      actorId: actor.id,
      action: "sub_task.update",
      entity: "SubTask",
      entityId: subTaskId,
    });
    revalidateWorkOrder(existing.target.workOrderId);
    return successState("messages.subTaskUpdated");
  } catch (error) {
    console.error("[tasks] update sub-task failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function deleteSubTaskAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:assign:department");
  const subTaskId = readText(formData, "subTaskId");
  if (!subTaskId) return errorState("messages.invalidData");

  const existing = await prisma.subTask.findUnique({
    where: { id: subTaskId },
    select: { id: true, target: { select: { departmentId: true, headId: true, workOrderId: true } } },
  });
  if (!existing) return errorState("errors.generic");
  if (!managesTarget(actor, existing.target)) return errorState("messages.forbidden");

  try {
    await prisma.subTask.delete({ where: { id: subTaskId } });
    await recordAudit({
      actorId: actor.id,
      action: "sub_task.delete",
      entity: "SubTask",
      entityId: subTaskId,
    });
    await recomputeWorkOrderStatus(existing.target.workOrderId);
    revalidateWorkOrder(existing.target.workOrderId);
    return successState("messages.subTaskDeleted");
  } catch (error) {
    if (isNotFound(error)) return errorState("errors.generic");
    console.error("[tasks] delete sub-task failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function updateProgressAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();
  const parsed = progressSchema.safeParse({
    subTaskId: readText(formData, "subTaskId"),
    progress: readText(formData, "progress"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const subTask = await loadSubTaskContext(parsed.data.subTaskId);
  if (!subTask) return errorState("errors.generic");

  const owns = canWorkOnSubTask(actor, subTask);
  const manages = managesTarget(actor, subTask.target);
  if (!owns && !manages) return errorState("messages.forbidden");

  const progress = parsed.data.progress;
  const status =
    subTask.status === "NEW" && progress > 0
      ? "IN_PROGRESS"
      : subTask.status === "PENDING_REVIEW"
        ? "IN_PROGRESS"
        : subTask.status;

  try {
    await prisma.subTask.update({
      where: { id: subTask.id },
      data: { progress, status },
    });
    await recomputeWorkOrderStatus(subTask.target.workOrderId);
    revalidateWorkOrder(subTask.target.workOrderId);
    return successState("messages.progressUpdated");
  } catch (error) {
    console.error("[tasks] update progress failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function reportSubTaskCompleteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();
  const subTaskId = readText(formData, "subTaskId");
  if (!subTaskId) return errorState("messages.invalidData");

  const subTask = await loadSubTaskContext(subTaskId);
  if (!subTask) return errorState("errors.generic");
  if (!canWorkOnSubTask(actor, subTask) && !managesTarget(actor, subTask.target)) {
    return errorState("messages.forbidden");
  }

  try {
    await prisma.subTask.update({
      where: { id: subTask.id },
      data: { status: "PENDING_REVIEW", progress: 100 },
    });
    await recordAudit({
      actorId: actor.id,
      action: "sub_task.report_complete",
      entity: "SubTask",
      entityId: subTask.id,
    });
    revalidateWorkOrder(subTask.target.workOrderId);
    return successState("messages.subTaskReported");
  } catch (error) {
    console.error("[tasks] report sub-task failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function approveSubTaskAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:approve");
  const subTaskId = readText(formData, "subTaskId");
  if (!subTaskId) return errorState("messages.invalidData");

  const subTask = await loadSubTaskContext(subTaskId);
  if (!subTask) return errorState("errors.generic");
  if (!managesTarget(actor, subTask.target)) return errorState("messages.forbidden");

  try {
    await prisma.subTask.update({
      where: { id: subTask.id },
      data: {
        status: "DONE",
        progress: 100,
        approvedById: actor.id,
        approvedAt: new Date(),
        completedAt: new Date(),
        rejectReason: null,
      },
    });
    await recordAudit({
      actorId: actor.id,
      action: "sub_task.approve",
      entity: "SubTask",
      entityId: subTask.id,
    });
    await recomputeWorkOrderStatus(subTask.target.workOrderId);
    revalidateWorkOrder(subTask.target.workOrderId);
    return successState("messages.subTaskApproved");
  } catch (error) {
    console.error("[tasks] approve sub-task failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function rejectSubTaskAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("task:approve");
  const parsed = rejectSubTaskSchema.safeParse({
    subTaskId: readText(formData, "subTaskId"),
    reason: readText(formData, "reason"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const subTask = await loadSubTaskContext(parsed.data.subTaskId);
  if (!subTask) return errorState("errors.generic");
  if (!managesTarget(actor, subTask.target)) return errorState("messages.forbidden");

  try {
    await prisma.subTask.update({
      where: { id: subTask.id },
      data: { status: "IN_PROGRESS", rejectReason: parsed.data.reason },
    });
    await recordAudit({
      actorId: actor.id,
      action: "sub_task.reject",
      entity: "SubTask",
      entityId: subTask.id,
    });
    revalidateWorkOrder(subTask.target.workOrderId);
    return successState("messages.subTaskRejected");
  } catch (error) {
    console.error("[tasks] reject sub-task failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function reportTargetAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();
  const targetId = readText(formData, "targetId");
  if (!targetId) return errorState("messages.invalidData");

  const target = await prisma.workOrderTarget.findUnique({
    where: { id: targetId },
    select: { id: true, departmentId: true, headId: true, workOrderId: true },
  });
  if (!target) return errorState("errors.generic");

  const workOrder = await loadVisibleWorkOrder(actor, target.workOrderId);
  if (!workOrder) return errorState("messages.forbidden");
  if (!managesTarget(actor, target) && actor.role !== "DIRECTOR" && actor.role !== "SECRETARY") {
    return errorState("messages.forbidden");
  }

  try {
    await prisma.workOrderTarget.update({
      where: { id: target.id },
      data: { reportedAt: new Date() },
    });
    await recordAudit({
      actorId: actor.id,
      action: "work_order_target.report",
      entity: "WorkOrderTarget",
      entityId: target.id,
    });
    await recomputeWorkOrderStatus(target.workOrderId);
    revalidateWorkOrder(target.workOrderId);
    return successState("messages.targetReported");
  } catch (error) {
    console.error("[tasks] report target failed", error);
    return errorState("messages.actionFailed");
  }
}

// ---------------------------------------------------------------------------
// Comments & attachments
// ---------------------------------------------------------------------------

export async function addCommentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();
  const parsed = commentSchema.safeParse({
    workOrderId: readText(formData, "workOrderId"),
    subTaskId: readText(formData, "subTaskId"),
    body: readText(formData, "body"),
  });
  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  let workOrderId = parsed.data.workOrderId;
  if (parsed.data.subTaskId) {
    const subTask = await prisma.subTask.findUnique({
      where: { id: parsed.data.subTaskId },
      select: { target: { select: { workOrderId: true } } },
    });
    if (!subTask) return errorState("errors.generic");
    workOrderId = subTask.target.workOrderId;
  }

  const visible = workOrderId ? await loadVisibleWorkOrder(actor, workOrderId) : null;
  if (!visible) return errorState("messages.forbidden");

  try {
    await prisma.comment.create({
      data: {
        workOrderId: parsed.data.workOrderId,
        subTaskId: parsed.data.subTaskId,
        authorId: actor.id,
        body: parsed.data.body,
      },
    });
    revalidateWorkOrder(workOrderId ?? undefined);
    return successState("messages.commentAdded");
  } catch (error) {
    console.error("[tasks] add comment failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function deleteCommentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();
  const commentId = readText(formData, "commentId");
  if (!commentId) return errorState("messages.invalidData");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      workOrderId: true,
      subTask: { select: { target: { select: { workOrderId: true } } } },
    },
  });
  if (!comment) return errorState("errors.generic");

  const workOrderId = comment.workOrderId ?? comment.subTask?.target.workOrderId ?? null;
  const visible = workOrderId ? await loadVisibleWorkOrder(actor, workOrderId) : null;
  if (!visible) return errorState("messages.forbidden");
  if (comment.authorId !== actor.id && actor.role !== "DIRECTOR" && actor.role !== "SECRETARY") {
    return errorState("messages.forbidden");
  }

  try {
    await prisma.comment.delete({ where: { id: commentId } });
    revalidateWorkOrder(workOrderId ?? undefined);
    return successState("messages.attachmentDeleted");
  } catch (error) {
    console.error("[tasks] delete comment failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function uploadAttachmentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorState("validation.fileRequired", { file: ["validation.fileRequired"] });
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return errorState("messages.fileTooLarge", { file: ["messages.fileTooLarge"] });
  }

  const workOrderId = readText(formData, "workOrderId") || null;
  const subTaskId = readText(formData, "subTaskId") || null;
  if (Boolean(workOrderId) === Boolean(subTaskId)) return errorState("messages.invalidData");

  let resolvedWorkOrderId = workOrderId;
  if (subTaskId) {
    const subTask = await prisma.subTask.findUnique({
      where: { id: subTaskId },
      select: { target: { select: { workOrderId: true } } },
    });
    if (!subTask) return errorState("errors.generic");
    resolvedWorkOrderId = subTask.target.workOrderId;
  }

  const visible = resolvedWorkOrderId
    ? await loadVisibleWorkOrder(actor, resolvedWorkOrderId)
    : null;
  if (!visible) return errorState("messages.forbidden");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await prisma.attachment.create({
      data: {
        workOrderId,
        subTaskId,
        fileName: file.name.slice(0, 200) || "file",
        mimeType: file.type || "application/octet-stream",
        size: buffer.byteLength,
        data: buffer,
        uploadedById: actor.id,
      },
    });
    await recordAudit({
      actorId: actor.id,
      action: "attachment.upload",
      entity: "Attachment",
      entityId: resolvedWorkOrderId,
      meta: { fileName: file.name, size: buffer.byteLength },
    });
    revalidateWorkOrder(resolvedWorkOrderId ?? undefined);
    return successState("messages.attachmentAdded");
  } catch (error) {
    console.error("[tasks] upload attachment failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function deleteAttachmentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireTaskUser();
  const attachmentId = readText(formData, "attachmentId");
  if (!attachmentId) return errorState("messages.invalidData");

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      uploadedById: true,
      workOrderId: true,
      subTask: { select: { target: { select: { workOrderId: true } } } },
    },
  });
  if (!attachment) return errorState("errors.generic");

  const workOrderId =
    attachment.workOrderId ?? attachment.subTask?.target.workOrderId ?? null;
  const visible = workOrderId ? await loadVisibleWorkOrder(actor, workOrderId) : null;
  if (!visible) return errorState("messages.forbidden");
  if (attachment.uploadedById !== actor.id && actor.role !== "DIRECTOR" && actor.role !== "SECRETARY") {
    return errorState("messages.forbidden");
  }

  try {
    await prisma.attachment.delete({ where: { id: attachmentId } });
    revalidateWorkOrder(workOrderId ?? undefined);
    return successState("messages.attachmentDeleted");
  } catch (error) {
    console.error("[tasks] delete attachment failed", error);
    return errorState("messages.actionFailed");
  }
}
