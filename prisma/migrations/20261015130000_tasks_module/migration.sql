-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_targets" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "headId" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_tasks" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "mainAssigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_task_collaborators" (
    "id" TEXT NOT NULL,
    "subTaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sub_task_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_followers" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT,
    "subTaskId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT,
    "subTaskId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_code_key" ON "work_orders"("code");

-- CreateIndex
CREATE INDEX "work_orders_createdById_idx" ON "work_orders"("createdById");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_order_targets_departmentId_idx" ON "work_order_targets"("departmentId");

-- CreateIndex
CREATE INDEX "work_order_targets_headId_idx" ON "work_order_targets"("headId");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_targets_workOrderId_departmentId_key" ON "work_order_targets"("workOrderId", "departmentId");

-- CreateIndex
CREATE INDEX "sub_tasks_targetId_idx" ON "sub_tasks"("targetId");

-- CreateIndex
CREATE INDEX "sub_tasks_mainAssigneeId_idx" ON "sub_tasks"("mainAssigneeId");

-- CreateIndex
CREATE INDEX "sub_tasks_status_idx" ON "sub_tasks"("status");

-- CreateIndex
CREATE INDEX "sub_task_collaborators_userId_idx" ON "sub_task_collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sub_task_collaborators_subTaskId_userId_key" ON "sub_task_collaborators"("subTaskId", "userId");

-- CreateIndex
CREATE INDEX "work_order_followers_userId_idx" ON "work_order_followers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_followers_workOrderId_userId_key" ON "work_order_followers"("workOrderId", "userId");

-- CreateIndex
CREATE INDEX "comments_workOrderId_idx" ON "comments"("workOrderId");

-- CreateIndex
CREATE INDEX "comments_subTaskId_idx" ON "comments"("subTaskId");

-- CreateIndex
CREATE INDEX "attachments_workOrderId_idx" ON "attachments"("workOrderId");

-- CreateIndex
CREATE INDEX "attachments_subTaskId_idx" ON "attachments"("subTaskId");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_targets" ADD CONSTRAINT "work_order_targets_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_targets" ADD CONSTRAINT "work_order_targets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_targets" ADD CONSTRAINT "work_order_targets_headId_fkey" FOREIGN KEY ("headId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "work_order_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_mainAssigneeId_fkey" FOREIGN KEY ("mainAssigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_task_collaborators" ADD CONSTRAINT "sub_task_collaborators_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "sub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_task_collaborators" ADD CONSTRAINT "sub_task_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_followers" ADD CONSTRAINT "work_order_followers_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_followers" ADD CONSTRAINT "work_order_followers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "sub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "sub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

