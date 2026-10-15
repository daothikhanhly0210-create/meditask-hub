import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { asRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  clearFailures,
  clientIp,
  lockedUntil,
  recordFailures,
  throttleKeys,
} from "@/lib/login-throttle";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const ip = clientIp(request.headers);
        const keys = throttleKeys(email, ip);

        // Locked out: do not touch the password, and do not count the attempt,
        // so hammering the form cannot push the lock further out.
        if (await lockedUntil(keys)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          await failAttempt(keys, email, ip);
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) {
          await failAttempt(keys, email, ip);
          return null;
        }

        await clearFailures(keys);

        await prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: asRole(user.role),
          departmentId: user.departmentId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});

/** Records a failed sign-in and logs it when the attempt triggers a lockout. */
async function failAttempt(keys: string[], email: string, ip: string | null): Promise<void> {
  const locked = await recordFailures(keys);
  if (locked) {
    await recordAudit({
      action: "auth.lockout",
      entity: "LoginAttempt",
      entityId: email,
      meta: { email, ip, lockedUntil: locked.toISOString() },
    });
  }
}
