import type { Role } from "@/lib/rbac";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      departmentId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    departmentId: string | null;
  }
}

// Auth.js v5 sources the JWT type from `@auth/core/jwt` (which `next-auth/jwt`
// re-exports). Augment both so the token fields are typed regardless of which
// specifier a given file imports.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    departmentId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    departmentId: string | null;
  }
}
