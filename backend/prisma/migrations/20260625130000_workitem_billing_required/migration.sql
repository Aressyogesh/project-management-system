-- Make billingStatus non-nullable on work_items with BILLABLE as default
-- Fill any existing nulls first
UPDATE "work_items" SET "billing_status" = 'BILLABLE' WHERE "billing_status" IS NULL;

-- Set default and NOT NULL
ALTER TABLE "work_items" ALTER COLUMN "billing_status" SET DEFAULT 'BILLABLE';
ALTER TABLE "work_items" ALTER COLUMN "billing_status" SET NOT NULL;
