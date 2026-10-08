-- CreateTable
CREATE TABLE "task_allocations" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "allocatedHours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "task_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_allocations_taskId_userId_date_key" ON "task_allocations"("taskId", "userId", "date");

-- CreateIndex
CREATE INDEX "task_allocations_userId_date_idx" ON "task_allocations"("userId", "date");

-- AddForeignKey
ALTER TABLE "task_allocations" ADD CONSTRAINT "task_allocations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_allocations" ADD CONSTRAINT "task_allocations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
