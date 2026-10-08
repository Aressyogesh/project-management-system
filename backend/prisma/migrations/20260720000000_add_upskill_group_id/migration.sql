-- AlterTable
ALTER TABLE "upskill_assignments" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "upskill_assignments_group_id_idx" ON "upskill_assignments"("groupId");
