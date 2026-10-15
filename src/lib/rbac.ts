export const ROLES = ["ADMIN", "DIRECTOR", "SECRETARY", "DEPT_HEAD", "STAFF"] as const;

export type Role = (typeof ROLES)[number];

/**
 * Permissions are scoped so the same verb can mean "company-wide" or "own
 * department only" (e.g. `task:assign:company` vs `task:assign:department`).
 * The task/report permissions are declared ahead of the modules that use them
 * (B2/B3) so the role design lives in one place.
 */
export const PERMISSIONS = [
  // System administration
  "user:manage",
  "department:manage",
  "settings:manage",
  // Reports
  "report:company", // detailed progress of every department
  "report:department", // detailed progress of own department
  "report:overview", // aggregate counts only, no task content
  // Tasks
  "task:assign:company", // create work orders and assign to department heads
  "task:assign:department", // break work down into sub-tasks in own department
  "task:view:company", // view every task
  "task:view:department", // view every task in own department
  "task:view:assigned", // view tasks tagged to me
  "task:update:progress", // update status / progress on my own tasks
  "task:approve", // accept a sub-task's completion and report it up
  "task:follow", // add/remove followers on a work order
  // Meetings & minutes
  "meeting:record",
  // Account
  "profile:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Single source of truth for role -> permission mapping.
 * Server actions and API routes must check this; never trust the client.
 *
 * ADMIN only administers accounts, departments and system settings; it takes
 * no part in the task flow and never sees detailed task/report content.
 */
const PERMISSION_MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: ["user:manage", "department:manage", "settings:manage", "report:overview", "profile:view"],
  DIRECTOR: ["report:company", "task:assign:company", "task:view:company", "task:follow", "profile:view"],
  SECRETARY: ["report:company", "task:assign:company", "task:view:company", "meeting:record", "profile:view"],
  DEPT_HEAD: [
    "report:department",
    "task:assign:department",
    "task:view:department",
    "task:view:assigned",
    "task:update:progress",
    "task:approve",
    "profile:view",
  ],
  STAFF: ["task:view:assigned", "task:update:progress", "profile:view"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function asRole(value: string): Role {
  return isRole(value) ? value : "STAFF";
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
