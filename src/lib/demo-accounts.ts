import type { Role } from "@/lib/rbac";

/**
 * Demo accounts created by `prisma/seed.ts`. Kept in a shared module so the
 * login screen and the seed script cannot drift apart.
 */
export const DEMO_PASSWORD = "Demo@12345";

export type DemoAccount = {
  role: Role;
  name: string;
  email: string;
};

/**
 * Each role uses its own email domain so the role is recognisable from the
 * address alone (no need to look up which account belongs to which role).
 */
export const demoAccounts: DemoAccount[] = [
  { role: "ADMIN", name: "Quản trị viên", email: "admin@admin.company.local" },
  { role: "DIRECTOR", name: "Giám đốc", email: "director@director.company.local" },
  { role: "SECRETARY", name: "Thư ký", email: "secretary@secretary.company.local" },
  { role: "DEPT_HEAD", name: "Trưởng khoa Khám bệnh", email: "head@head.company.local" },
  { role: "STAFF", name: "Nhân viên Khoa Khám bệnh", email: "staff@staff.company.local" },
];
