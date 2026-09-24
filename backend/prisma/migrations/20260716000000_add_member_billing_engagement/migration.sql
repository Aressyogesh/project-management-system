-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MemberBilling" AS ENUM ('BILLABLE', 'NON_BILLABLE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MemberEngagement" AS ENUM ('FULL_DAY', 'HALF_DAY', 'PARTIAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable
ALTER TABLE "project_members"
  ADD COLUMN IF NOT EXISTS "billing"         "MemberBilling"    NOT NULL DEFAULT 'BILLABLE',
  ADD COLUMN IF NOT EXISTS "engagement"      "MemberEngagement" NOT NULL DEFAULT 'FULL_DAY',
  ADD COLUMN IF NOT EXISTS "engagementHours" INTEGER;
