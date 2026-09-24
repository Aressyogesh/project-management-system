-- Add per-project work item counter (starts at 10000 so first ID is xxxxx10001)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "workItemCounter" INTEGER NOT NULL DEFAULT 10000;

-- Add unique human-readable display ID to work items (e.g. HOR10001)
ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "displayId" VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS "work_items_displayId_key" ON "work_items"("displayId");
