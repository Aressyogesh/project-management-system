-- AlterTable: expand Project.description from VarChar(1000) to Text
ALTER TABLE "projects" ALTER COLUMN "description" TYPE TEXT;
