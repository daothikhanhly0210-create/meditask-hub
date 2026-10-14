import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@12345";

const departments = [
  { code: "HR", name: "Nhân sự", nameEn: "Human Resources", description: "Tuyển dụng và quản lý nhân sự" },
  { code: "ACC", name: "Kế toán", nameEn: "Accounting", description: "Tài chính và kế toán" },
  { code: "SALES", name: "Kinh doanh", nameEn: "Sales", description: "Bán hàng và chăm sóc khách hàng" },
  { code: "ENG", name: "Kỹ thuật", nameEn: "Engineering", description: "Phát triển sản phẩm và hạ tầng" },
  { code: "MKT", name: "Marketing", nameEn: "Marketing", description: "Truyền thông và thương hiệu" },
];

type SeedUser = {
  email: string;
  name: string;
  role: "ADMIN" | "BOSS" | "SECRETARY" | "DEPT_HEAD" | "EMPLOYEE";
  departmentCode: string | null;
  jobTitle: string;
  phone?: string;
};

const users: SeedUser[] = [
  { email: "admin@admin.company.local", name: "Quản trị viên", role: "ADMIN", departmentCode: null, jobTitle: "Quản trị hệ thống" },
  { email: "boss@boss.company.local", name: "Giám đốc", role: "BOSS", departmentCode: null, jobTitle: "Giám đốc điều hành" },
  { email: "secretary@secretary.company.local", name: "Thư ký", role: "SECRETARY", departmentCode: null, jobTitle: "Thư ký ban giám đốc" },
  { email: "head@head.company.local", name: "Trưởng phòng Kỹ thuật", role: "DEPT_HEAD", departmentCode: "ENG", jobTitle: "Trưởng phòng Kỹ thuật" },
  { email: "employee@employee.company.local", name: "Nhân viên Kỹ thuật", role: "EMPLOYEE", departmentCode: "ENG", jobTitle: "Lập trình viên" },
];

/**
 * Older seeds used a single `@company.local` domain for every role. Rename any
 * such accounts to the new per-role domains so re-seeding does not leave
 * duplicate demo users behind.
 */
const legacyEmailAliases: Record<string, string> = {
  "admin@company.local": "admin@admin.company.local",
  "boss@company.local": "boss@boss.company.local",
  "secretary@company.local": "secretary@secretary.company.local",
  "head@company.local": "head@head.company.local",
  "employee@company.local": "employee@employee.company.local",
};

const settings = [
  { key: "company.name", value: "Công ty Nội bộ" },
  { key: "deadline.warningDays", value: "2" },
  { key: "meeting.language", value: "vi" },
];

async function main() {
  console.log("Seeding departments...");
  const departmentIdByCode = new Map<string, string>();

  for (const department of departments) {
    const record = await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name, nameEn: department.nameEn, description: department.description },
      create: department,
    });
    departmentIdByCode.set(department.code, record.id);
  }

  console.log("Seeding users...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Rename any accounts created by an older seed (single @company.local domain)
  // so re-seeding does not leave duplicate demo users behind.
  for (const [legacyEmail, newEmail] of Object.entries(legacyEmailAliases)) {
    const [legacyUser, existingUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: legacyEmail } }),
      prisma.user.findUnique({ where: { email: newEmail } }),
    ]);
    if (legacyUser && !existingUser) {
      await prisma.user.update({ where: { id: legacyUser.id }, data: { email: newEmail } });
      console.log(`  Renamed ${legacyEmail} -> ${newEmail}`);
    }
  }

  for (const user of users) {
    const departmentId = user.departmentCode ? departmentIdByCode.get(user.departmentCode) ?? null : null;
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        departmentId,
        jobTitle: user.jobTitle,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId,
        jobTitle: user.jobTitle,
        phone: user.phone ?? null,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }

  console.log("Assigning department head...");
  const head = await prisma.user.findUnique({ where: { email: "head@head.company.local" } });
  const engineering = departmentIdByCode.get("ENG");
  if (head && engineering) {
    await prisma.department.update({ where: { id: engineering }, data: { headId: head.id } });
  }

  console.log("Seeding settings...");
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("");
  console.log("Seed complete. Demo accounts (password: %s):", DEMO_PASSWORD);
  for (const user of users) {
    console.log(`  - ${user.role.padEnd(9)} ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
