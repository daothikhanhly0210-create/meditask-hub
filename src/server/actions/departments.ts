"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { departmentSchema, toFieldErrors } from "@/lib/validation";
import { errorState, successState, type ActionState } from "@/lib/action-state";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function uniqueField(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  if ((error as { code?: string }).code !== "P2002") return null;
  const target = (error as { meta?: { target?: string[] | string } }).meta?.target;
  const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
  if (fields.includes("code")) return "messages.codeTaken";
  if (fields.includes("name")) return "messages.nameTaken";
  return "messages.actionFailed";
}

function revalidateDepartmentViews() {
  revalidatePath("/admin/departments");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

export async function createDepartmentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("department:manage");

  const parsed = departmentSchema.safeParse({
    name: readText(formData, "name"),
    code: readText(formData, "code"),
    nameEn: readText(formData, "nameEn"),
    description: readText(formData, "description"),
    headId: readText(formData, "headId"),
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  try {
    const department = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        nameEn: data.nameEn,
        description: data.description,
        headId: data.headId,
      },
    });

    await recordAudit({
      actorId: actor.id,
      action: "department.create",
      entity: "Department",
      entityId: department.id,
      meta: { name: department.name, code: department.code },
    });

    revalidateDepartmentViews();
    return successState("messages.departmentCreated");
  } catch (error) {
    const message = uniqueField(error);
    console.error("[departments] create failed", error);
    return errorState(message ?? "messages.actionFailed");
  }
}

export async function updateDepartmentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("department:manage");
  const departmentId = readText(formData, "departmentId");

  if (!departmentId) return errorState("messages.invalidData");

  const parsed = departmentSchema.safeParse({
    name: readText(formData, "name"),
    code: readText(formData, "code"),
    nameEn: readText(formData, "nameEn"),
    description: readText(formData, "description"),
    headId: readText(formData, "headId"),
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  try {
    await prisma.department.update({
      where: { id: departmentId },
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        nameEn: data.nameEn,
        description: data.description,
        headId: data.headId,
      },
    });

    await recordAudit({
      actorId: actor.id,
      action: "department.update",
      entity: "Department",
      entityId: departmentId,
      meta: { name: data.name, code: data.code },
    });

    revalidateDepartmentViews();
    return successState("messages.departmentUpdated");
  } catch (error) {
    const message = uniqueField(error);
    console.error("[departments] update failed", error);
    return errorState(message ?? "messages.actionFailed");
  }
}

export async function deleteDepartmentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("department:manage");
  const departmentId = readText(formData, "departmentId");

  if (!departmentId) return errorState("messages.invalidData");

  try {
    const memberCount = await prisma.user.count({ where: { departmentId } });
    if (memberCount > 0) {
      return errorState("admin.cannotDeleteHeadDepartment");
    }

    await prisma.department.delete({ where: { id: departmentId } });
    await recordAudit({
      actorId: actor.id,
      action: "department.delete",
      entity: "Department",
      entityId: departmentId,
    });

    revalidateDepartmentViews();
    return successState("messages.departmentDeleted");
  } catch (error) {
    console.error("[departments] delete failed", error);
    return errorState("messages.actionFailed");
  }
}
