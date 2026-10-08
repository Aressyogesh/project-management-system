-- CreateEnum
CREATE TYPE "TaskListType" AS ENUM ('GENERAL', 'PROJECT_MANAGEMENT', 'DEVELOPMENT', 'QA', 'SPRINT');

-- CreateTable
CREATE TABLE "task_lists" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "TaskListType" NOT NULL,
    "sprintNumber" INTEGER,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_lists_projectId_idx" ON "task_lists"("projectId");

-- AddForeignKey
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
