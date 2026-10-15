import type { NextAuthConfig } from "next-auth";
import { canAny, requiredPermissionsForPath } from "@/lib/rbac";

/**
 * Edge-safe NextAuth configuration. This file must NOT import Prisma or any
 * Node-only dependency because it is loaded by the middleware (edge runtime).
 * The Credentials provider lives in `src/auth.ts` (Node runtime).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.departmentId = user.departmentId ?? null;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      // `unstable_update` from a server action re-runs this callback with
      // trigger === "update" so the flag clears right after a password change
      // (see changePasswordAction), without forcing a fresh sign-in.
      const updated = (session as { user?: { mustChangePassword?: boolean } } | undefined)?.user;
      if (trigger === "update" && typeof updated?.mustChangePassword === "boolean") {
        token.mustChangePassword = updated.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.departmentId = token.departmentId ?? null;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoginPage = pathname === "/login";
      const isAuthenticated = Boolean(auth?.user?.id);

      // The login page is always reachable. The page itself redirects already
      // authenticated users, which avoids a redirect loop when a session token
      // is still valid but the account was deactivated server-side.
      if (isLoginPage) {
        return true;
      }

      if (!isAuthenticated) {
        return false;
      }

      // Accounts created by an administrator (or whose password was reset) must
      // set their own password before they can reach anything else.
      if (auth?.user?.mustChangePassword && pathname !== "/profile") {
        return Response.redirect(new URL("/profile", request.nextUrl));
      }

      const required = requiredPermissionsForPath(pathname);
      if (required.length > 0 && !canAny(auth?.user?.role, required)) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
