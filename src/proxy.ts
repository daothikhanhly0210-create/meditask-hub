import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 * The file must export a single function, either as the default export or
 * named `proxy`. We default-export the Auth.js wrapper, whose `authorized`
 * callback (see src/auth.config.ts) performs authentication and RBAC checks.
 *
 * Security note (Next.js docs): Proxy is not a substitute for per-action
 * authorization — Server Functions are POSTs to the page route and can be
 * skipped by matcher changes. Every server action in this project re-checks
 * permissions via `requirePermission()`.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect everything except Next internals, API routes and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
