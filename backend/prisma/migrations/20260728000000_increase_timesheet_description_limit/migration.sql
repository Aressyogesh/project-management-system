-- AlterTable: increase timesheet description limit from 500 to 1000 characters
ALTER TABLE "timesheet_entries" ALTER COLUMN "description" TYPE VARCHAR(1000);
