export const ROLES = ["ADMIN", "BOSS", "SECRETARY", "DEPT_HEAD", "EMPLOYEE"] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "user:manage",
  "department:manage",
  "settings:manage",
  "report:company",
  "meeting:record",
  "task:assign",
  "task:view:department",
  "task:complete",
  "profile:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Single source of truth for role -> permission mapping.
 * Server actions and API routes must check this; never trust the client.
 */
const PERMISSION_MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: ["user:manage", "department:manage", "settings:manage", "report:company", "profile:view"],
  BOSS: ["report:company", "profile:view"],
  SECRETARY: ["meeting:record", "report:company", "profile:view"],
  DEPT_HEAD: ["task:assign", "task:view:department", "profile:view"],
  EMPLOYEE: ["task:complete", "profile:view"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function asRole(value: string): Role {
  return isRole(value) ? value : "EMPLOYEE";
}

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return PERMISSION_MATRIX[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return PERMISSION_MATRIX[role];
}

/**
 * Map an application path to the permission required to view it.
 * Returns null when the path only requires authentication.
 */
export function requiredPermissionForPath(pathname: string): Permission | null {
  if (pathname.startsWith("/admin/users")) return "user:manage";
  if (pathname.startsWith("/admin/departments")) return "department:manage";
  if (pathname.startsWith("/admin")) return "settings:manage";
  return null;
}
