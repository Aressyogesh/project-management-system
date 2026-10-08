-- =============================================================================
-- Migration: 20260528000000_add_missing_tables_and_columns
-- Creates all tables / enums that were applied via `prisma db push` locally
-- but never had migration files, causing production deploys to fail.
-- Must run BEFORE 20260603000000_add_work_item_display_id.
-- All DDL uses IF NOT EXISTS / DO-EXCEPTION blocks for idempotency.
-- =============================================================================

-- ─── 1. Missing Enums ─────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "TimesheetApprovalStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveType" AS ENUM ('SICK', 'CASUAL', 'EARNED', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "WorkItemType" AS ENUM ('EPIC', 'USER_STORY', 'TASK', 'SUB_TASK', 'BUG');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Note: CLOSED value is added by migration 20260627000000_add_closed_board_status
DO $$ BEGIN
  CREATE TYPE "BoardStatus" AS ENUM (
    'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW',
    'READY_FOR_QA', 'IN_QA', 'QA_DONE', 'QA'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugSeverity" AS ENUM (
    'SHOW_STOPPER', 'BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Note: TECHNICAL and FUNCTIONAL added by 20260627020000_add_bug_classification_technical_functional
DO $$ BEGIN
  CREATE TYPE "BugClassification" AS ENUM (
    'SECURITY', 'CRASH_HANG', 'DATA_LOSS', 'PERFORMANCE', 'UI_USABILITY',
    'OTHER_BUG', 'OTHER', 'FEATURE_NEW', 'ENHANCEMENT', 'DESIGN', 'NEW_BUG',
    'CODE_REVIEW', 'UNIT_TESTING', 'SUGGESTION', 'PROJECT_MANAGEMENT',
    'EXISTING_APPLICATION'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugFlag" AS ENUM ('INTERNAL', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugReproducibility" AS ENUM (
    'ALWAYS', 'SOMETIMES', 'RARELY', 'UNABLE', 'NEVER_TRIED', 'NOT_APPLICABLE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugReminderType" AS ENUM ('NONE', 'DAILY', 'ONE_DAY', 'TWO_DAYS', 'THREE_DAYS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BugStatus" AS ENUM (
    'OPEN', 'REOPEN', 'TO_BE_TESTED', 'IN_PROGRESS',
    'CLOSED', 'ACKNOWLEDGED', 'DEFERRED', 'ON_HOLD'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TestCaseStatus" AS ENUM ('NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 2. Business Units ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "business_units" (
    "id"          TEXT         NOT NULL,
    "name"        VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000),
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_units_name_key" ON "business_units"("name");

-- ─── 3. Add businessUnitId to departments and clients ─────────────────────────

ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "businessUnitId" TEXT;
DO $$ BEGIN
  ALTER TABLE "departments"
    ADD CONSTRAINT "departments_businessUnitId_fkey"
    FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "businessUnitId" TEXT;
DO $$ BEGIN
  ALTER TABLE "clients"
    ADD CONSTRAINT "clients_businessUnitId_fkey"
    FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 4. Fix milestones: add name column, widen description to TEXT nullable ───

ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200);
ALTER TABLE "milestones" ALTER COLUMN "description" TYPE TEXT;
ALTER TABLE "milestones" ALTER COLUMN "description" DROP NOT NULL;

-- ─── 5. Sprints ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sprints" (
    "id"          TEXT         NOT NULL,
    "projectId"   TEXT         NOT NULL,
    "milestoneId" TEXT,
    "name"        VARCHAR(100) NOT NULL,
    "goal"        VARCHAR(500),
    "startDate"   DATE,
    "endDate"     DATE,
    "isActive"    BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sprints_projectId_idx"   ON "sprints"("projectId");
CREATE INDEX IF NOT EXISTS "sprints_milestoneId_idx" ON "sprints"("milestoneId");

DO $$ BEGIN
  ALTER TABLE "sprints" ADD CONSTRAINT "sprints_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "sprints" ADD CONSTRAINT "sprints_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 6. Work Items ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "work_items" (
    "id"                   TEXT                NOT NULL,
    "displayId"            VARCHAR(20),
    "projectId"            TEXT                NOT NULL,
    "parentId"             TEXT,
    "sprintId"             TEXT,
    "type"                 "WorkItemType"      NOT NULL,
    "status"               "BoardStatus"       NOT NULL DEFAULT 'TODO',
    "title"                VARCHAR(300)        NOT NULL,
    "description"          VARCHAR(5000),
    "priority"             "TaskPriority"      NOT NULL DEFAULT 'MEDIUM',
    "assigneeId"           TEXT,
    "reporterId"           TEXT                NOT NULL,
    "storyPoints"          INTEGER,
    "estimatedHours"       DECIMAL(6,2),
    "labels"               TEXT[]              NOT NULL DEFAULT '{}',
    "components"           TEXT[]              NOT NULL DEFAULT '{}',
    "fixVersion"           VARCHAR(100),
    "severity"             "BugSeverity",
    "bugClassification"    "BugClassification",
    "environment"          VARCHAR(200),
    "stepsToRepro"         VARCHAR(3000),
    "definitionOfDone"     VARCHAR(3000),
    "completedAt"          TIMESTAMP(3),
    "reopenCount"          INTEGER             NOT NULL DEFAULT 0,
    "position"             INTEGER             NOT NULL DEFAULT 0,
    "startDate"            DATE,
    "dueDate"              DATE,
    "bugFlag"              "BugFlag",
    "bugReproducibility"   "BugReproducibility",
    "bugStatus"            "BugStatus",
    "module"               VARCHAR(100),
    "responsibleUserId"    TEXT,
    "billingStatus"        "BillingStatus",
    "affectedBuildVersion" VARCHAR(50),
    "fixedBuildVersion"    VARCHAR(50),
    "reminderType"         "BugReminderType"   DEFAULT 'NONE',
    "releaseMilestoneId"   TEXT,
    "affectedMilestoneId"  TEXT,
    "createdAt"            TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "work_items_displayId_key"  ON "work_items"("displayId");
CREATE INDEX        IF NOT EXISTS "work_items_projectId_idx"  ON "work_items"("projectId");
CREATE INDEX        IF NOT EXISTS "work_items_sprintId_idx"   ON "work_items"("sprintId");
CREATE INDEX        IF NOT EXISTS "work_items_assigneeId_idx" ON "work_items"("assigneeId");
CREATE INDEX        IF NOT EXISTS "work_items_parentId_idx"   ON "work_items"("parentId");

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_sprintId_fkey"
    FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_responsibleUserId_fkey"
    FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_releaseMilestoneId_fkey"
    FOREIGN KEY ("releaseMilestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_items" ADD CONSTRAINT "work_items_affectedMilestoneId_fkey"
    FOREIGN KEY ("affectedMilestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 7. Work Item Comments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "work_item_comments" (
    "id"         TEXT         NOT NULL,
    "workItemId" TEXT         NOT NULL,
    "content"    VARCHAR(3000) NOT NULL,
    "authorId"   TEXT         NOT NULL,
    "mentions"   TEXT[]       NOT NULL DEFAULT '{}',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_item_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_item_comments_workItemId_idx" ON "work_item_comments"("workItemId");

DO $$ BEGIN
  ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_item_comments" ADD CONSTRAINT "work_item_comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 8. Work Item Attachments ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "work_item_attachments" (
    "id"           TEXT         NOT NULL,
    "workItemId"   TEXT         NOT NULL,
    "filename"     VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType"     VARCHAR(100) NOT NULL,
    "size"         INTEGER      NOT NULL,
    "uploadedById" TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_item_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_item_attachments_workItemId_idx" ON "work_item_attachments"("workItemId");

DO $$ BEGIN
  ALTER TABLE "work_item_attachments" ADD CONSTRAINT "work_item_attachments_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_item_attachments" ADD CONSTRAINT "work_item_attachments_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 9. Work Item Activities ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "work_item_activities" (
    "id"         TEXT         NOT NULL,
    "workItemId" TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "action"     VARCHAR(100) NOT NULL,
    "field"      VARCHAR(100),
    "oldValue"   VARCHAR(500),
    "newValue"   VARCHAR(500),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_item_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_item_activities_workItemId_idx" ON "work_item_activities"("workItemId");

DO $$ BEGIN
  ALTER TABLE "work_item_activities" ADD CONSTRAINT "work_item_activities_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "work_item_activities" ADD CONSTRAINT "work_item_activities_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 10. Timesheet Entries ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "timesheet_entries" (
    "id"             TEXT                     NOT NULL,
    "workItemId"     TEXT                     NOT NULL,
    "userId"         TEXT                     NOT NULL,
    "date"           DATE                     NOT NULL,
    "hours"          DECIMAL(5,2)             NOT NULL,
    "description"    VARCHAR(500),
    "approvalStatus" "TimesheetApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById"   TEXT,
    "approvedAt"     TIMESTAMP(3),
    "rejectionNote"  VARCHAR(500),
    "createdAt"      TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "timesheet_entries_workItemId_idx"   ON "timesheet_entries"("workItemId");
CREATE INDEX IF NOT EXISTS "timesheet_entries_userId_date_idx"  ON "timesheet_entries"("userId", "date");

DO $$ BEGIN
  ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 11. Notifications ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "notifications" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "type"       VARCHAR(50)  NOT NULL,
    "title"      VARCHAR(200) NOT NULL,
    "body"       VARCHAR(500) NOT NULL,
    "workItemId" TEXT,
    "isRead"     BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 12. Leave Requests ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "type"         "LeaveType"  NOT NULL,
    "startDate"    DATE         NOT NULL,
    "endDate"      DATE         NOT NULL,
    "totalDays"    DOUBLE PRECISION NOT NULL,
    "reason"       VARCHAR(500),
    "status"       "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvalNote" VARCHAR(500),
    "approvedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_requests_userId_idx"               ON "leave_requests"("userId");
CREATE INDEX IF NOT EXISTS "leave_requests_status_idx"               ON "leave_requests"("status");
CREATE INDEX IF NOT EXISTS "leave_requests_startDate_endDate_idx"    ON "leave_requests"("startDate", "endDate");

DO $$ BEGIN
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 13. KPI Records ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "kpi_records" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "period"      VARCHAR(7)   NOT NULL,
    "metricId"    VARCHAR(50)  NOT NULL,
    "points"      DOUBLE PRECISION NOT NULL,
    "notes"       VARCHAR(500),
    "enteredById" TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kpi_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "kpi_records_userId_period_metricId_key" ON "kpi_records"("userId", "period", "metricId");
CREATE INDEX        IF NOT EXISTS "kpi_records_userId_period_idx"          ON "kpi_records"("userId", "period");

DO $$ BEGIN
  ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_enteredById_fkey"
    FOREIGN KEY ("enteredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 14. Board Column Configs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "board_column_configs" (
    "id"        TEXT          NOT NULL,
    "projectId" TEXT          NOT NULL,
    "status"    "BoardStatus" NOT NULL,
    "label"     VARCHAR(100)  NOT NULL,
    "updatedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "board_column_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "board_column_configs_projectId_status_key" ON "board_column_configs"("projectId", "status");
CREATE INDEX        IF NOT EXISTS "board_column_configs_projectId_idx"         ON "board_column_configs"("projectId");

DO $$ BEGIN
  ALTER TABLE "board_column_configs" ADD CONSTRAINT "board_column_configs_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 15. Test Cases ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "test_cases" (
    "id"             TEXT             NOT NULL,
    "workItemId"     TEXT             NOT NULL,
    "title"          VARCHAR(300)     NOT NULL,
    "preconditions"  VARCHAR(1000),
    "steps"          VARCHAR(3000)    NOT NULL,
    "expectedResult" VARCHAR(1000)    NOT NULL,
    "actualResult"   VARCHAR(1000),
    "status"         "TestCaseStatus" NOT NULL DEFAULT 'NOT_RUN',
    "createdById"    TEXT             NOT NULL,
    "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "test_cases_workItemId_idx" ON "test_cases"("workItemId");

DO $$ BEGIN
  ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_workItemId_fkey"
    FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
