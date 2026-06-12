-- AlterTable: expand Project.description from VarChar(1000) to Text
ALTER TABLE "Project" ALTER COLUMN "description" TYPE TEXT;
