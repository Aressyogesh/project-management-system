-- ============================================================
-- PMS Cleanup Script — Remove Tasks, Sub-Tasks & Bugs
-- ============================================================
-- IMPORTANT: Take a DB backup before running this script.
--   pg_dump -U postgres pms_db > backup_before_cleanup.sql
--
-- Run in psql:
--   psql -U postgres -d pms_db -f cleanup-tasks-bugs.sql
-- ============================================================

BEGIN;

-- ── Step 1: Preview counts before deletion ──────────────────

SELECT 'BEFORE CLEANUP' AS status;

SELECT type, COUNT(*) AS count
FROM work_items
WHERE type IN ('TASK', 'SUB_TASK', 'BUG')
GROUP BY type;

SELECT COUNT(*) AS task_list_tasks FROM tasks;

-- ── Step 2: Delete board Work Items (TASK, SUB_TASK, BUG) ───
-- Related records deleted automatically via CASCADE:
--   work_item_comments, work_item_attachments, work_item_activities,
--   timesheet_entries, test_cases, notifications (SET NULL)

DELETE FROM work_items
WHERE type IN ('TASK', 'SUB_TASK', 'BUG');

-- ── Step 3: Delete classic Task-List Tasks ───────────────────
-- Related records deleted automatically via CASCADE:
--   task_comments, task_attachments, task_allocations

DELETE FROM tasks;

-- ── Step 4: Confirm counts after deletion ───────────────────

SELECT 'AFTER CLEANUP' AS status;

SELECT type, COUNT(*) AS count
FROM work_items
WHERE type IN ('TASK', 'SUB_TASK', 'BUG')
GROUP BY type;

SELECT COUNT(*) AS task_list_tasks FROM tasks;

COMMIT;

-- ============================================================
-- Optional: Also remove EPIC and USER_STORY work items
-- Uncomment the block below if you want to clear ALL work items
-- ============================================================

-- BEGIN;
-- DELETE FROM work_items;
-- SELECT 'All work items removed: ' || COUNT(*) FROM work_items;
-- COMMIT;
