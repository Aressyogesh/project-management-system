-- AlterColumn: allow decimal engagement hours (e.g. 4.5h) for PARTIAL engagement
ALTER TABLE "project_members" ALTER COLUMN "engagementHours" TYPE DOUBLE PRECISION;
