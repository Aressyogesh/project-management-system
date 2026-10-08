-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('GLOBAL', 'PROJECT');

-- AlterTable
ALTER TABLE "announcements"
  ADD COLUMN "scope" "AnnouncementScope" NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
