import type { NextAuthConfig } from "next-auth";
import { can, requiredPermissionForPath } from "@/lib/rbac";

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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.departmentId = user.departmentId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.departmentId = token.departmentId ?? null;
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

      const required = requiredPermissionForPath(pathname);
      if (required && !can(auth?.user?.role, required)) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
