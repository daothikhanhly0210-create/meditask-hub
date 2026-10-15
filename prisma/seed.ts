import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@12345";

const departments = [
  { code: "KKB", name: "Khoa Khám bệnh", nameEn: "Outpatient Department", description: "Khám bệnh và điều trị ngoại trú" },
  { code: "KHTH", name: "Phòng Kế hoạch tổng hợp", nameEn: "Planning & General Affairs", description: "Kế hoạch, tổng hợp và điều phối" },
  { code: "TCCB", name: "Phòng Tổ chức cán bộ", nameEn: "Personnel & Organization", description: "Tổ chức, cán bộ và nhân sự" },
  { code: "DUOC", name: "Khoa Dược", nameEn: "Pharmacy Department", description: "Quản lý dược và cấp phát thuốc" },
  { code: "XN", name: "Khoa Xét nghiệm", nameEn: "Laboratory Department", description: "Xét nghiệm và chẩn đoán" },
];

type SeedUser = {
  email: string;
  name: string;
  role: "ADMIN" | "DIRECTOR" | "SECRETARY" | "DEPT_HEAD" | "STAFF";
  departmentCode: string | null;
  jobTitle: string;
  phone?: string;
};

const users: SeedUser[] = [
  { email: "admin@admin.company.local", name: "Quản trị viên", role: "ADMIN", departmentCode: null, jobTitle: "Quản trị hệ thống" },
  { email: "director@director.company.local", name: "Giám đốc", role: "DIRECTOR", departmentCode: null, jobTitle: "Giám đốc bệnh viện" },
  { email: "secretary@secretary.company.local", name: "Thư ký", role: "SECRETARY", departmentCode: null, jobTitle: "Thư ký ban giám đốc" },
  { email: "head@head.company.local", name: "Trưởng khoa Khám bệnh", role: "DEPT_HEAD", departmentCode: "KKB", jobTitle: "Trưởng khoa Khám bệnh" },
  { email: "staff@staff.company.local", name: "Nhân viên Khoa Khám bệnh", role: "STAFF", departmentCode: "KKB", jobTitle: "Điều dưỡng" },
];

/**
 * Older seeds used a single `@company.local` domain for every role, and an
 * earlier revision named the roles BOSS/EMPLOYEE. Rename any such accounts to
 * the current emails/roles so re-seeding does not leave duplicate demo users
 * behind.
 */
const legacyEmailAliases: Record<string, string> = {
  "admin@company.local": "admin@admin.company.local",
  "boss@company.local": "director@director.company.local",
  "boss@boss.company.local": "director@director.company.local",
  "secretary@company.local": "secretary@secretary.company.local",
  "head@company.local": "head@head.company.local",
  "employee@company.local": "staff@staff.company.local",
  "employee@employee.company.local": "staff@staff.company.local",
};

const settings = [
  { key: "company.name", value: "Bệnh viện Đa khoa" },
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

  // An earlier revision named the roles BOSS/EMPLOYEE. Migrate any remaining
  // rows (created through the admin UI) to the new DIRECTOR/STAFF names.
  console.log("Migrating legacy role names...");
  const legacyRoleRenames: Array<[string, string]> = [
    ["BOSS", "DIRECTOR"],
    ["EMPLOYEE", "STAFF"],
  ];
  for (const [from, to] of legacyRoleRenames) {
    const { count } = await prisma.user.updateMany({ where: { role: from }, data: { role: to } });
    if (count > 0) console.log(`  Renamed ${count} user(s) with role ${from} -> ${to}`);
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

  // This seed used to create a company-style department set (HR/ACC/SALES/ENG/
  // MKT). Retire those demo rows now that the sample data is hospital-style so
  // re-seeding does not leave a stale set behind. Custom departments are kept.
  console.log("Retiring legacy demo departments...");
  const legacyDepartmentCodes = ["HR", "ACC", "SALES", "ENG", "MKT"];
  const retired = await prisma.department.deleteMany({
    where: { code: { in: legacyDepartmentCodes }, users: { none: {} } },
  });
  if (retired.count > 0) console.log(`  Removed ${retired.count} legacy department(s)`);

  console.log("Assigning department head...");
  const head = await prisma.user.findUnique({ where: { email: "head@head.company.local" } });
  const outpatient = departmentIdByCode.get("KKB");
  if (head && outpatient) {
    await prisma.department.update({ where: { id: outpatient }, data: { headId: head.id } });
  }

  // Demo work-assignment data (B2). Only seeded into an empty task table so
  // real data is never touched by re-running the seed.
  console.log("Seeding demo work orders...");
  const existingWorkOrders = await prisma.workOrder.count();
  if (existingWorkOrders === 0) {
    const year = new Date().getFullYear();
    const director = await prisma.user.findUnique({
      where: { email: "director@director.company.local" },
    });
    const secretary = await prisma.user.findUnique({
      where: { email: "secretary@secretary.company.local" },
    });
    const staff = await prisma.user.findUnique({
      where: { email: "staff@staff.company.local" },
    });
    const outpatient = departmentIdByCode.get("KKB");
    const pharmacy = departmentIdByCode.get("DUOC");

    if (director && head && staff && outpatient && pharmacy) {
      const first = await prisma.workOrder.create({
        data: {
          code: `PGV-${year}-001`,
          title: "Rà soát quy trình tiếp đón bệnh nhân",
          description:
            "Đánh giá thời gian chờ, biểu mẫu và luồng tiếp đón tại khu vực khám bệnh.",
          priority: "HIGH",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "IN_PROGRESS",
          createdById: director.id,
          targets: {
            create: [
              { departmentId: outpatient, headId: head.id },
              { departmentId: pharmacy, headId: null },
            ],
          },
          comments: {
            create: [
              {
                authorId: director.id,
                body: "Ưu tiên hoàn thành trước cuộc họp giao ban tuần sau.",
              },
            ],
          },
        },
        select: { targets: { select: { id: true, departmentId: true } } },
      });

      const outpatientTarget = first.targets.find(
        (target) => target.departmentId === outpatient,
      );
      if (outpatientTarget) {
        await prisma.subTask.create({
          data: {
            targetId: outpatientTarget.id,
            title: "Khảo sát thời gian chờ tại quầy tiếp đón",
            priority: "HIGH",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            status: "IN_PROGRESS",
            mainAssigneeId: staff.id,
            createdById: head.id,
          },
        });
        await prisma.subTask.create({
          data: {
            targetId: outpatientTarget.id,
            title: "Cập nhật biểu mẫu tiếp đón",
            priority: "NORMAL",
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: "NEW",
            mainAssigneeId: staff.id,
            createdById: head.id,
          },
        });
      }
    }

    if (director && pharmacy) {
      const second = await prisma.workOrder.create({
        data: {
          code: `PGV-${year}-002`,
          title: "Báo cáo tình hình sử dụng thuốc quý",
          description: "Tổng hợp số liệu sử dụng thuốc và tồn kho của Khoa Dược.",
          priority: "NORMAL",
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: "DONE",
          closedAt: new Date(),
          createdById: director.id,
          targets: { create: [{ departmentId: pharmacy }] },
          followers: secretary ? { create: [{ userId: secretary.id }] } : undefined,
        },
        select: { targets: { select: { id: true } } },
      });

      const pharmacyTarget = second.targets[0];
      if (pharmacyTarget) {
        await prisma.subTask.create({
          data: {
            targetId: pharmacyTarget.id,
            title: "Tổng hợp số liệu sử dụng thuốc và tồn kho",
            priority: "NORMAL",
            dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            status: "DONE",
            completedAt: new Date(),
            approvedById: director.id,
            approvedAt: new Date(),
            createdById: director.id,
          },
        });
      }
    }
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
