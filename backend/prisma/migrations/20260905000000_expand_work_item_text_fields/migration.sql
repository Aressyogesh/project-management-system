-- AlterTable: expand work_items text fields from VarChar to unlimited Text
ALTER TABLE "work_items" ALTER COLUMN "description" TYPE TEXT;
ALTER TABLE "work_items" ALTER COLUMN "stepsToRepro" TYPE TEXT;
ALTER TABLE "work_items" ALTER COLUMN "definitionOfDone" TYPE TEXT;
