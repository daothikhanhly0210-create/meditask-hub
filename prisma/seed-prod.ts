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
  { code: "HR", name: "Nhân sự", nameEn: "Human Resources", description: "Tuyển dụng và quản lý nhân sự" },
  { code: "ACC", name: "Kế toán", nameEn: "Accounting", description: "Tài chính và kế toán" },
  { code: "SALES", name: "Kinh doanh", nameEn: "Sales", description: "Bán hàng và chăm sóc khách hàng" },
  { code: "ENG", name: "Kỹ thuật", nameEn: "Engineering", description: "Phát triển sản phẩm và hạ tầng" },
  { code: "MKT", name: "Marketing", nameEn: "Marketing", description: "Truyền thông và thương hiệu" },
];

const settings = [
  { key: "company.name", value: "Công ty Nội bộ" },
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
