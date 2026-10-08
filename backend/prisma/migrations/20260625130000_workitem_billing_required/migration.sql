-- Make billingStatus non-nullable on work_items with BILLABLE as default
-- Fill any existing nulls first
UPDATE "work_items" SET "billingStatus" = 'BILLABLE' WHERE "billingStatus" IS NULL;

-- Set default and NOT NULL
ALTER TABLE "work_items" ALTER COLUMN "billingStatus" SET DEFAULT 'BILLABLE';
ALTER TABLE "work_items" ALTER COLUMN "billingStatus" SET NOT NULL;
