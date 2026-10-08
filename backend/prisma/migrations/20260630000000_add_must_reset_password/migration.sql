-- AlterTable: add mustResetPassword flag to users
ALTER TABLE "users" ADD COLUMN "mustResetPassword" BOOLEAN NOT NULL DEFAULT false;
