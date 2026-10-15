/**
 * Production seed.
 *
 * Unlike `prisma/seed.ts` (which creates the five demo accounts for local
 * development), this script creates only the base reference data and a single
 * administrator account whose credentials come from environment variables:
 *
 *   ADMIN_EMAIL     e.g. admin@admin.company.local
 *   ADMIN_PASSWORD  required, at least 8 characters
 *   ADMIN_NAME      optional display name
 *
 * Run once after the first `prisma migrate deploy`:
 *   node prisma/seed-prod.ts
 *
 * It is safe to re-run: departments/settings are upserted and the admin's
 * password is only set when the account is first created.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const departments = [
  { code: "KKB", name: "Khoa Khám bệnh", nameEn: "Outpatient Department", description: "Khám bệnh và điều trị ngoại trú" },
  { code: "KHTH", name: "Phòng Kế hoạch tổng hợp", nameEn: "Planning & General Affairs", description: "Kế hoạch, tổng hợp và điều phối" },
  { code: "TCCB", name: "Phòng Tổ chức cán bộ", nameEn: "Personnel & Organization", description: "Tổ chức, cán bộ và nhân sự" },
  { code: "DUOC", name: "Khoa Dược", nameEn: "Pharmacy Department", description: "Quản lý dược và cấp phát thuốc" },
  { code: "XN", name: "Khoa Xét nghiệm", nameEn: "Laboratory Department", description: "Xét nghiệm và chẩn đoán" },
];

const settings = [
  { key: "company.name", value: "Bệnh viện Đa khoa" },
  { key: "deadline.warningDays", value: "2" },
  { key: "meeting.language", value: "vi" },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Quản trị viên";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set. Example:\n" +
        '  $env:ADMIN_EMAIL="admin@admin.company.local"; $env:ADMIN_PASSWORD="..." ; node prisma/seed-prod.ts',
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  console.log("Seeding departments...");
  for (const department of departments) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name, nameEn: department.nameEn, description: department.description },
      create: department,
    });
  }

  // An earlier revision seeded a company-style department set. Retire those
  // rows (only when they have no members) so the sample data matches the
  // hospital-style set above.
  const legacyDepartmentCodes = ["HR", "ACC", "SALES", "ENG", "MKT"];
  const retired = await prisma.department.deleteMany({
    where: { code: { in: legacyDepartmentCodes }, users: { none: {} } },
  });
  if (retired.count > 0) console.log(`  Removed ${retired.count} legacy department(s)`);

  console.log("Seeding settings...");
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("Seeding administrator...");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, role: "ADMIN", isActive: true },
    });
    console.log(`  Administrator already exists, kept password: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        passwordHash,
        isActive: true,
        mustChangePassword: true,
      },
    });
    console.log(`  Created administrator: ${email}`);
  }

  console.log("\nProduction seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
