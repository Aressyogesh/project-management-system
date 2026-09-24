-- Remove LeaveType column and enum from leave_requests
ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "type";

-- Drop the enum type
DROP TYPE IF EXISTS "LeaveType";
