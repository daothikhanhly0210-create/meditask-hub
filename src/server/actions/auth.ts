"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { signIn, signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { clientIp, lockedUntil, throttleKeys } from "@/lib/login-throttle";
import { changePasswordSchema, toFieldErrors } from "@/lib/validation";
import { errorState, successState, type ActionState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return errorState("auth.loginFailed");
  }

  const email = parsed.data.email.toLowerCase();
  const keys = throttleKeys(email, clientIp(await headers()));

  // Say so plainly when the account (or the network) is temporarily locked,
  // instead of the generic "wrong email or password".
  if (await lockedUntil(keys)) {
    return errorState("auth.tooManyAttempts");
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return successState();
  } catch (error) {
    if (error instanceof AuthError) {
      return errorState("auth.invalidCredentials");
    }
    // Anything else (including the NEXT_REDIRECT thrown on success) must bubble up.
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function changePasswordAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (confirmPassword !== parsed.data.newPassword) {
    return { ok: false, fieldErrors: { confirmPassword: ["profile.passwordMismatch"] } };
  }

  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) {
    return errorState("errors.generic");
  }

  const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!matches) {
    return { ok: false, fieldErrors: { currentPassword: ["profile.wrongPassword"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: actor.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // Clear the forced-change flag in the current session token as well, so the
  // user is not bounced back to /profile by the proxy on their next navigation.
  await unstable_update({ user: { mustChangePassword: false } });

  await recordAudit({
    actorId: actor.id,
    action: "password.change",
    entity: "User",
    entityId: actor.id,
  });

  return successState("profile.passwordChanged");
}
