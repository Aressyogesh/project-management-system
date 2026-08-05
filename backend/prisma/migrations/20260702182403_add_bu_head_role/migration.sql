-- AlterEnum
ALTER TYPE "SystemRole" ADD VALUE 'BU_HEAD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "managedBusinessUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managedBusinessUnitId_fkey" FOREIGN KEY ("managedBusinessUnitId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
