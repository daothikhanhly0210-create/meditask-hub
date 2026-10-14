"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { createUserSchema, resetPasswordSchema, toFieldErrors, updateUserSchema } from "@/lib/validation";
import { errorState, successState, type ActionState } from "@/lib/action-state";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function notFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  );
}

function readUserForm(formData: FormData) {
  return {
    name: readText(formData, "name"),
    email: readText(formData, "email"),
    role: readText(formData, "role"),
    departmentId: readText(formData, "departmentId"),
    jobTitle: readText(formData, "jobTitle"),
    phone: readText(formData, "phone"),
  };
}

function revalidateUserViews() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/departments");
  revalidatePath("/dashboard");
}

export async function createUserAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("user:manage");

  const parsed = createUserSchema.safeParse({
    ...readUserForm(formData),
    password: readText(formData, "password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: data.role,
        departmentId: data.departmentId,
        jobTitle: data.jobTitle,
        phone: data.phone,
        isActive: true,
        mustChangePassword: true,
      },
    });

    await recordAudit({
      actorId: actor.id,
      action: "user.create",
      entity: "User",
      entityId: user.id,
      meta: { email: user.email, role: user.role },
    });

    revalidateUserViews();
    return successState("messages.userCreated");
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, message: "messages.emailTaken", fieldErrors: { email: ["messages.emailTaken"] } };
    }
    console.error("[users] create failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function updateUserAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("user:manage");
  const userId = readText(formData, "userId");

  if (!userId) {
    return errorState("messages.invalidData");
  }

  const parsed = updateUserSchema.safeParse({
    ...readUserForm(formData),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  const data = parsed.data;

  // Prevent an administrator from locking themselves out of the system.
  if (userId === actor.id && (data.role !== "ADMIN" || !data.isActive)) {
    return errorState("admin.cannotChangeOwnRole");
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        departmentId: data.departmentId,
        jobTitle: data.jobTitle,
        phone: data.phone,
        isActive: data.isActive,
      },
    });

    await recordAudit({
      actorId: actor.id,
      action: "user.update",
      entity: "User",
      entityId: userId,
      meta: { role: data.role, isActive: data.isActive },
    });

    revalidateUserViews();
    return successState("messages.userUpdated");
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, message: "messages.emailTaken", fieldErrors: { email: ["messages.emailTaken"] } };
    }
    if (notFoundError(error)) {
      return errorState("errors.generic");
    }
    console.error("[users] update failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function toggleUserActiveAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("user:manage");
  const userId = readText(formData, "userId");
  const nextActive = readText(formData, "nextActive") === "true";

  if (!userId) return errorState("messages.invalidData");
  if (userId === actor.id && !nextActive) {
    return errorState("admin.cannotDeleteSelf");
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { isActive: nextActive } });
    await recordAudit({
      actorId: actor.id,
      action: nextActive ? "user.unlock" : "user.lock",
      entity: "User",
      entityId: userId,
    });
    revalidateUserViews();
    return successState(nextActive ? "messages.userUnlocked" : "messages.userLocked");
  } catch (error) {
    if (notFoundError(error)) return errorState("errors.generic");
    console.error("[users] toggle active failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function resetUserPasswordAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("user:manage");

  const parsed = resetPasswordSchema.safeParse({
    userId: readText(formData, "userId"),
    password: readText(formData, "password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "messages.invalidData", fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        mustChangePassword: true,
      },
    });

    await recordAudit({
      actorId: actor.id,
      action: "user.resetPassword",
      entity: "User",
      entityId: parsed.data.userId,
    });

    revalidatePath("/admin/users");
    return successState("messages.passwordReset");
  } catch (error) {
    if (notFoundError(error)) return errorState("errors.generic");
    console.error("[users] reset password failed", error);
    return errorState("messages.actionFailed");
  }
}

export async function deleteUserAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("user:manage");
  const userId = readText(formData, "userId");

  if (!userId) return errorState("messages.invalidData");
  if (userId === actor.id) return errorState("admin.cannotDeleteSelf");

  try {
    await prisma.user.delete({ where: { id: userId } });
    await recordAudit({
      actorId: actor.id,
      action: "user.delete",
      entity: "User",
      entityId: userId,
    });
    revalidateUserViews();
    return successState("messages.userDeleted");
  } catch (error) {
    if (notFoundError(error)) return errorState("errors.generic");
    console.error("[users] delete failed", error);
    return errorState("messages.actionFailed");
  }
}
