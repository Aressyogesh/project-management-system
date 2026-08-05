-- Add isPlanned column to leave_requests (default true = planned)
ALTER TABLE "leave_requests" ADD COLUMN "isPlanned" BOOLEAN NOT NULL DEFAULT true;
