-- Progress is now derived from sub-task status, and departments are closed
-- explicitly instead of "reported".

-- AlterTable
ALTER TABLE "sub_tasks" DROP COLUMN "progress";

-- AlterTable
ALTER TABLE "work_order_targets" DROP COLUMN "reportedAt",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "closedReason" TEXT;

-- AddForeignKey
ALTER TABLE "work_order_targets" ADD CONSTRAINT "work_order_targets_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
