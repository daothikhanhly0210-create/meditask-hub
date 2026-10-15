-- AlterTable: rename the default role from the legacy EMPLOYEE code to STAFF.
-- Existing rows are migrated by `prisma/seed.ts` (legacy role rename step).
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STAFF';
