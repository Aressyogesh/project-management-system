-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_createdById_fkey";

-- AlterTable
ALTER TABLE "announcements" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
