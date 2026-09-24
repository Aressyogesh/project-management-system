-- CreateEnum
CREATE TYPE "UpskillType" AS ENUM ('LEARNING', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "UpskillStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "upskill_assignments" (
    "id" TEXT NOT NULL,
    "type" "UpskillType" NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "toolScript" VARCHAR(300),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "UpskillStatus" NOT NULL DEFAULT 'ASSIGNED',
    "evidenceFilePath" VARCHAR(500),
    "evidenceFileName" VARCHAR(255),
    "rejectionReason" VARCHAR(500),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upskill_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upskill_progress_logs" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL,
    "hoursSpent" DOUBLE PRECISION NOT NULL,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upskill_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upskill_assignments_assignedToId_idx" ON "upskill_assignments"("assignedToId");

-- CreateIndex
CREATE INDEX "upskill_assignments_status_idx" ON "upskill_assignments"("status");

-- CreateIndex
CREATE INDEX "upskill_progress_logs_assignmentId_idx" ON "upskill_progress_logs"("assignmentId");

-- AddForeignKey
ALTER TABLE "upskill_assignments" ADD CONSTRAINT "upskill_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upskill_assignments" ADD CONSTRAINT "upskill_assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upskill_assignments" ADD CONSTRAINT "upskill_assignments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upskill_progress_logs" ADD CONSTRAINT "upskill_progress_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "upskill_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upskill_progress_logs" ADD CONSTRAINT "upskill_progress_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
