-- Track specifically IN_QA → IN_PROGRESS moves for Internal Rework Ratio KPI
ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "qaReopenCount" INTEGER NOT NULL DEFAULT 0;
