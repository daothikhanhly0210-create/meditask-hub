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
  { role: "BOSS", name: "Giám đốc", email: "boss@boss.company.local" },
  { role: "SECRETARY", name: "Thư ký", email: "secretary@secretary.company.local" },
  { role: "DEPT_HEAD", name: "Trưởng phòng Kỹ thuật", email: "head@head.company.local" },
  { role: "EMPLOYEE", name: "Nhân viên Kỹ thuật", email: "employee@employee.company.local" },
];

export const seedDepartments = [
  { name: "Nhân sự", nameEn: "Human Resources", code: "HR", description: "Tuyển dụng và quản lý nhân sự" },
  { name: "Kế toán", nameEn: "Accounting", code: "ACC", description: "Tài chính và kế toán" },
  { name: "Kinh doanh", nameEn: "Sales", code: "SALES", description: "Bán hàng và chăm sóc khách hàng" },
  { name: "Kỹ thuật", nameEn: "Engineering", code: "ENG", description: "Phát triển sản phẩm và hạ tầng" },
  { name: "Marketing", nameEn: "Marketing", code: "MKT", description: "Truyền thông và thương hiệu" },
];
