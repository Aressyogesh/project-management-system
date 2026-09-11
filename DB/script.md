# PMS — Production Database Schema

Run this entire script in the **Supabase SQL Editor**.
Safe to re-run on any partial state — all statements use `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `EXCEPTION WHEN others THEN NULL`.

```sql
-- ================================================================
-- PMS — Complete Production Schema — DEFINITIVE VERSION
-- Handles any partial state from previous runs.
-- Adds PKs explicitly before any FK that references a table.
-- Uses EXCEPTION WHEN others to catch all constraint errors.
-- ================================================================

-- ─── Enums ───────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE "SystemRole" AS ENUM ('SUPER_USER','ADMIN','EMPLOYEE'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ShiftType" AS ENUM ('DAY','AFTERNOON','NIGHT'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProjectType" AS ENUM ('DEDICATED','T_AND_M','FIXED'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE','ARCHIVE','ON_HOLD'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProjectRole" AS ENUM ('PROJECT_MANAGER','TEAM_LEAD','DEVELOPER','QA','DESIGNER','DEVOPS'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','COMPLETED','DELAYED'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TaskListType" AS ENUM ('GENERAL','PROJECT_MANAGEMENT','DEVELOPMENT','QA','SPRINT'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TaskPriority" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','ON_REVIEW','COMPLETED'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BillingStatus" AS ENUM ('BILLABLE','NON_BILLABLE'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TimesheetApprovalStatus" AS ENUM ('PENDING','SUBMITTED','APPROVED','REJECTED'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeaveType" AS ENUM ('SICK','CASUAL','EARNED','MATERNITY','PATERNITY','UNPAID','OTHER'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeaveStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WorkItemType" AS ENUM ('EPIC','USER_STORY','TASK','SUB_TASK','BUG'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BoardStatus" AS ENUM ('TODO','IN_PROGRESS','BLOCKED','IN_REVIEW','QA','QA_DONE'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BugSeverity" AS ENUM ('SHOW_STOPPER','BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BugClassification" AS ENUM ('SECURITY','CRASH_HANG','DATA_LOSS','PERFORMANCE','UI_USABILITY','OTHER_BUG','OTHER','FEATURE_NEW','ENHANCEMENT','DESIGN','NEW_BUG','CODE_REVIEW','UNIT_TESTING','SUGGESTION','PROJECT_MANAGEMENT','EXISTING_APPLICATION'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BugFlag" AS ENUM ('INTERNAL','EXTERNAL'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BugReproducibility" AS ENUM ('ALWAYS','SOMETIMES','RARELY','UNABLE','NEVER_TRIED','NOT_APPLICABLE'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BugReminderType" AS ENUM ('NONE','DAILY','ONE_DAY','TWO_DAYS','THREE_DAYS'); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BugStatus" AS ENUM ('OPEN','REOPEN','TO_BE_TESTED','IN_PROGRESS','CLOSED','ACKNOWLEDGED','DEFERRED','ON_HOLD'); EXCEPTION WHEN others THEN NULL; END $$;

-- ================================================================
-- STEP 1: Create all tables (IF NOT EXISTS — skips existing ones)
-- Only truly required non-FK columns are in the CREATE body.
-- Everything else is added via ADD COLUMN IF NOT EXISTS below.
-- ================================================================

CREATE TABLE IF NOT EXISTS business_units (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(2000),
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name      VARCHAR(100) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name        VARCHAR(50) NOT NULL,
  "startTime" VARCHAR(8) NOT NULL,
  "endTime"   VARCHAR(8) NOT NULL,
  "workHours" INTEGER NOT NULL DEFAULT 8,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id                 TEXT NOT NULL DEFAULT 'singleton',
  "companyName"      VARCHAR(200) NOT NULL DEFAULT '',
  "webAddress"       TEXT,
  street             TEXT,
  city               TEXT,
  state              TEXT,
  country            TEXT NOT NULL DEFAULT 'India',
  "zipCode"          VARCHAR(20),
  timezone           TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "backDateLogValue" INTEGER NOT NULL DEFAULT 8,
  "backDateLogUnit"  VARCHAR(10) NOT NULL DEFAULT 'Days',
  "emailDomains"     TEXT[] NOT NULL DEFAULT '{}',
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_config (
  id                         TEXT NOT NULL DEFAULT 'singleton',
  "dateFormat"               VARCHAR(20) NOT NULL DEFAULT 'DD-MM-YYYY',
  "timeFormat"               VARCHAR(4) NOT NULL DEFAULT '24',
  "taskDurationIn"           VARCHAR(10) NOT NULL DEFAULT 'hours',
  "firstDayOfWeek"           VARCHAR(10) NOT NULL DEFAULT 'Monday',
  "businessHoursStart"       VARCHAR(6) NOT NULL DEFAULT '10:00',
  "businessHoursStartPeriod" VARCHAR(2) NOT NULL DEFAULT 'AM',
  "businessHoursEnd"         VARCHAR(6) NOT NULL DEFAULT '07:00',
  "businessHoursEndPeriod"   VARCHAR(2) NOT NULL DEFAULT 'PM',
  "workingDays"              JSONB NOT NULL DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
  "updatedAt"                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
  id            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name          VARCHAR(100) NOT NULL,
  date          DATE NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  token       TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "isRevoked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name            VARCHAR(150) NOT NULL,
  "contactPerson" VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  address         VARCHAR(300),
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name        VARCHAR(200) NOT NULL,
  description VARCHAR(1000),
  "startDate" DATE,
  "endDate"   DATE,
  budget      DECIMAL(12,2),
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  id        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  status      TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_lists (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name        VARCHAR(200) NOT NULL,
  description VARCHAR(500),
  "sprintNumber" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  title       VARCHAR(300) NOT NULL,
  description VARCHAR(2000),
  "startDate" DATE,
  "dueDate"   DATE,
  "estimatedHours" DECIMAL(6,2),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_allocations (
  id               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  date             DATE NOT NULL,
  "allocatedHours" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  filename       VARCHAR(255) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "mimeType"     VARCHAR(100) NOT NULL,
  size           INTEGER NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  content     VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprints (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name        VARCHAR(100) NOT NULL,
  goal        VARCHAR(500),
  "startDate" DATE,
  "endDate"   DATE,
  "isActive"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_items (
  id            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  title         VARCHAR(300) NOT NULL,
  description   VARCHAR(5000),
  "storyPoints" INTEGER,
  "estimatedHours" DECIMAL(6,2),
  labels        TEXT[] NOT NULL DEFAULT '{}',
  components    TEXT[] NOT NULL DEFAULT '{}',
  "fixVersion"  VARCHAR(100),
  environment   VARCHAR(200),
  "stepsToRepro" VARCHAR(3000),
  "completedAt" TIMESTAMPTZ,
  "reopenCount" INTEGER NOT NULL DEFAULT 0,
  position      INTEGER NOT NULL DEFAULT 0,
  "startDate"   DATE,
  "dueDate"     DATE,
  module        VARCHAR(100),
  "affectedBuildVersion" VARCHAR(50),
  "fixedBuildVersion"    VARCHAR(50),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  date            DATE NOT NULL,
  hours           DECIMAL(5,2) NOT NULL,
  description     VARCHAR(500),
  "approvedAt"    TIMESTAMPTZ,
  "rejectionNote" VARCHAR(500),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_item_comments (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  content     VARCHAR(3000) NOT NULL,
  mentions    TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_item_activities (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  action      VARCHAR(100) NOT NULL,
  field       VARCHAR(100),
  "oldValue"  VARCHAR(500),
  "newValue"  VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_item_attachments (
  id             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  filename       VARCHAR(255) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "mimeType"     VARCHAR(100) NOT NULL,
  size           INTEGER NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(500) NOT NULL,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_records (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  period      VARCHAR(7) NOT NULL,
  "metricId"  VARCHAR(50) NOT NULL,
  points      DOUBLE PRECISION NOT NULL,
  notes       VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "startDate" DATE NOT NULL,
  "endDate"   DATE NOT NULL,
  "totalDays" INTEGER NOT NULL,
  reason      VARCHAR(500),
  "approvalNote" VARCHAR(500),
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_logs (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  date        DATE NOT NULL,
  type        VARCHAR(20) NOT NULL,
  description VARCHAR(200),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_logs (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  period      VARCHAR(7) NOT NULL,
  topic       VARCHAR(200) NOT NULL,
  hours       DOUBLE PRECISION NOT NULL,
  description VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS innovation_logs (
  id          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  period      VARCHAR(7) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  impact      VARCHAR(500) NOT NULL,
  type        VARCHAR(30) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- STEP 2: Add ALL missing columns (safe on both new and old tables)
-- ================================================================

-- shifts
DO $$ BEGIN ALTER TABLE shifts ADD COLUMN "shiftType" "ShiftType" NOT NULL DEFAULT 'DAY'; EXCEPTION WHEN others THEN NULL; END $$;

-- departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS "businessUnitId" TEXT;

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "fullName"      VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone           VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "joinDate"      DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "profilePhoto"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "departmentId"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "shiftId"       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt"   TIMESTAMPTZ;
DO $$ BEGIN ALTER TABLE users ADD COLUMN "systemRole" TEXT NOT NULL DEFAULT 'EMPLOYEE'; EXCEPTION WHEN others THEN NULL; END $$;

-- refresh_tokens
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "businessUnitId" TEXT;

-- projects
DO $$ BEGIN ALTER TABLE projects ADD COLUMN "projectType" "ProjectType" NOT NULL DEFAULT 'FIXED'; EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "clientId"     TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- project_members
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS "userId"    TEXT;
DO $$ BEGIN ALTER TABLE project_members ADD COLUMN "projectRole" "ProjectRole" NOT NULL DEFAULT 'DEVELOPER'; EXCEPTION WHEN others THEN NULL; END $$;

-- milestones
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS "projectId"         TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS name                VARCHAR(200);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS description         TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS "deliveryNote"      VARCHAR(1000);
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS "startDate"         DATE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS "dueDate"           DATE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS "responsibleUserId" TEXT;
DO $$ BEGIN ALTER TABLE milestones ALTER COLUMN status TYPE "MilestoneStatus" USING status::"MilestoneStatus"; EXCEPTION WHEN others THEN NULL; END $$;

-- task_lists
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS "projectId" TEXT;
DO $$ BEGIN ALTER TABLE task_lists ADD COLUMN type "TaskListType" NOT NULL DEFAULT 'GENERAL'; EXCEPTION WHEN others THEN NULL; END $$;

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "projectId"    TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "taskListId"   TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "milestoneId"  TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "createdById"  TEXT;
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN priority "TaskPriority" NOT NULL DEFAULT 'MEDIUM'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'BILLABLE'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN status "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED'; EXCEPTION WHEN others THEN NULL; END $$;

-- task_allocations
ALTER TABLE task_allocations ADD COLUMN IF NOT EXISTS "taskId" TEXT;
ALTER TABLE task_allocations ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- task_attachments
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS "taskId"       TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;

-- task_comments
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS "taskId"   TEXT;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS "authorId" TEXT;

-- sprints
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS "projectId"   TEXT;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS "milestoneId" TEXT;

-- work_items
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "projectId"           TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "parentId"            TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "sprintId"            TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "assigneeId"          TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "reporterId"          TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "responsibleUserId"   TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "releaseMilestoneId"  TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS "affectedMilestoneId" TEXT;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN type "WorkItemType" NOT NULL DEFAULT 'TASK'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN status "BoardStatus" NOT NULL DEFAULT 'TODO'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN priority "TaskPriority" NOT NULL DEFAULT 'MEDIUM'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN severity "BugSeverity"; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN "bugClassification" "BugClassification"; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN "bugFlag" "BugFlag"; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN "bugReproducibility" "BugReproducibility"; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN "bugStatus" "BugStatus"; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN "billingStatus" "BillingStatus"; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items ADD COLUMN "reminderType" "BugReminderType" DEFAULT 'NONE'; EXCEPTION WHEN others THEN NULL; END $$;

-- timesheet_entries
ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS "workItemId"   TEXT;
ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS "userId"       TEXT;
ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
DO $$ BEGIN ALTER TABLE timesheet_entries ADD COLUMN "approvalStatus" "TimesheetApprovalStatus" NOT NULL DEFAULT 'PENDING'; EXCEPTION WHEN others THEN NULL; END $$;

-- work_item_comments
ALTER TABLE work_item_comments ADD COLUMN IF NOT EXISTS "workItemId" TEXT;
ALTER TABLE work_item_comments ADD COLUMN IF NOT EXISTS "authorId"   TEXT;

-- work_item_activities
ALTER TABLE work_item_activities ADD COLUMN IF NOT EXISTS "workItemId" TEXT;
ALTER TABLE work_item_activities ADD COLUMN IF NOT EXISTS "userId"     TEXT;

-- work_item_attachments
ALTER TABLE work_item_attachments ADD COLUMN IF NOT EXISTS "workItemId"   TEXT;
ALTER TABLE work_item_attachments ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "userId"     TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "workItemId" TEXT;

-- kpi_records
ALTER TABLE kpi_records ADD COLUMN IF NOT EXISTS "userId"      TEXT;
ALTER TABLE kpi_records ADD COLUMN IF NOT EXISTS "enteredById" TEXT;

-- leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "userId"       TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
DO $$ BEGIN ALTER TABLE leave_requests ADD COLUMN type "LeaveType" NOT NULL DEFAULT 'CASUAL'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_requests ADD COLUMN status "LeaveStatus" NOT NULL DEFAULT 'PENDING'; EXCEPTION WHEN others THEN NULL; END $$;

-- leave_logs
ALTER TABLE leave_logs ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- learning_logs
ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- innovation_logs
ALTER TABLE innovation_logs ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- ================================================================
-- STEP 3: Add PRIMARY KEYS (must exist before any FK references)
-- EXCEPTION WHEN others catches both duplicate and missing-col errors
-- ================================================================

DO $$ BEGIN ALTER TABLE business_units     ADD CONSTRAINT business_units_pkey     PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE departments        ADD CONSTRAINT departments_pkey         PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE shifts             ADD CONSTRAINT shifts_pkey              PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users              ADD CONSTRAINT users_pkey               PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE company_settings   ADD CONSTRAINT company_settings_pkey    PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE portal_config      ADD CONSTRAINT portal_config_pkey       PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE holidays           ADD CONSTRAINT holidays_pkey            PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE refresh_tokens     ADD CONSTRAINT refresh_tokens_pkey      PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clients            ADD CONSTRAINT clients_pkey             PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects           ADD CONSTRAINT projects_pkey            PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE project_members    ADD CONSTRAINT project_members_pkey     PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE milestones         ADD CONSTRAINT milestones_pkey          PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_lists         ADD CONSTRAINT task_lists_pkey          PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks              ADD CONSTRAINT tasks_pkey               PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_allocations   ADD CONSTRAINT task_allocations_pkey    PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_attachments   ADD CONSTRAINT task_attachments_pkey    PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_comments      ADD CONSTRAINT task_comments_pkey       PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sprints            ADD CONSTRAINT sprints_pkey             PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items         ADD CONSTRAINT work_items_pkey          PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE timesheet_entries  ADD CONSTRAINT timesheet_entries_pkey   PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_comments    ADD CONSTRAINT work_item_comments_pkey    PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_activities  ADD CONSTRAINT work_item_activities_pkey  PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_attachments ADD CONSTRAINT work_item_attachments_pkey PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications     ADD CONSTRAINT notifications_pkey        PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE kpi_records       ADD CONSTRAINT kpi_records_pkey          PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_requests    ADD CONSTRAINT leave_requests_pkey       PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_logs        ADD CONSTRAINT leave_logs_pkey           PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE learning_logs     ADD CONSTRAINT learning_logs_pkey        PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE innovation_logs   ADD CONSTRAINT innovation_logs_pkey      PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END $$;

-- ================================================================
-- STEP 4: Unique constraints
-- ================================================================

DO $$ BEGIN ALTER TABLE business_units  ADD CONSTRAINT business_units_name_key  UNIQUE (name);           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE departments     ADD CONSTRAINT departments_name_key      UNIQUE (name);           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE shifts          ADD CONSTRAINT shifts_shiftType_key      UNIQUE ("shiftType");    EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users           ADD CONSTRAINT users_email_key           UNIQUE (email);          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE holidays        ADD CONSTRAINT holidays_date_key         UNIQUE (date);           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE refresh_tokens  ADD CONSTRAINT refresh_tokens_token_key  UNIQUE (token);          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clients         ADD CONSTRAINT clients_name_key          UNIQUE (name);           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE project_members ADD CONSTRAINT project_members_projectId_userId_key UNIQUE ("projectId","userId"); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_allocations ADD CONSTRAINT task_allocations_taskId_userId_date_key UNIQUE ("taskId","userId",date); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE kpi_records     ADD CONSTRAINT kpi_records_userId_period_metricId_key UNIQUE ("userId",period,"metricId"); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_logs      ADD CONSTRAINT leave_logs_userId_date_key UNIQUE ("userId",date); EXCEPTION WHEN others THEN NULL; END $$;

-- ================================================================
-- STEP 5: Foreign key constraints (tables have PKs now)
-- ================================================================

DO $$ BEGIN ALTER TABLE departments     ADD CONSTRAINT departments_businessUnitId_fkey  FOREIGN KEY ("businessUnitId") REFERENCES business_units(id) ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users           ADD CONSTRAINT users_departmentId_fkey          FOREIGN KEY ("departmentId")   REFERENCES departments(id);                       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users           ADD CONSTRAINT users_shiftId_fkey               FOREIGN KEY ("shiftId")        REFERENCES shifts(id);                            EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE refresh_tokens  ADD CONSTRAINT refresh_tokens_userId_fkey       FOREIGN KEY ("userId")         REFERENCES users(id) ON DELETE CASCADE;           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clients         ADD CONSTRAINT clients_businessUnitId_fkey      FOREIGN KEY ("businessUnitId") REFERENCES business_units(id) ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects        ADD CONSTRAINT projects_clientId_fkey           FOREIGN KEY ("clientId")       REFERENCES clients(id);                           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects        ADD CONSTRAINT projects_departmentId_fkey       FOREIGN KEY ("departmentId")   REFERENCES departments(id);                       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE project_members ADD CONSTRAINT project_members_projectId_fkey   FOREIGN KEY ("projectId")      REFERENCES projects(id) ON DELETE CASCADE;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE project_members ADD CONSTRAINT project_members_userId_fkey      FOREIGN KEY ("userId")         REFERENCES users(id)    ON DELETE CASCADE;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE milestones      ADD CONSTRAINT milestones_projectId_fkey        FOREIGN KEY ("projectId")         REFERENCES projects(id) ON DELETE CASCADE;     EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE milestones      ADD CONSTRAINT milestones_responsibleUserId_fkey FOREIGN KEY ("responsibleUserId") REFERENCES users(id)    ON DELETE SET NULL;   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_lists      ADD CONSTRAINT task_lists_projectId_fkey        FOREIGN KEY ("projectId")      REFERENCES projects(id) ON DELETE CASCADE;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks           ADD CONSTRAINT tasks_projectId_fkey             FOREIGN KEY ("projectId")    REFERENCES projects(id)   ON DELETE CASCADE;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks           ADD CONSTRAINT tasks_taskListId_fkey            FOREIGN KEY ("taskListId")   REFERENCES task_lists(id) ON DELETE CASCADE;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks           ADD CONSTRAINT tasks_milestoneId_fkey           FOREIGN KEY ("milestoneId")  REFERENCES milestones(id) ON DELETE SET NULL;       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks           ADD CONSTRAINT tasks_assignedToId_fkey          FOREIGN KEY ("assignedToId") REFERENCES users(id)      ON DELETE SET NULL;       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks           ADD CONSTRAINT tasks_createdById_fkey           FOREIGN KEY ("createdById")  REFERENCES users(id);                               EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_allocations ADD CONSTRAINT task_allocations_taskId_fkey    FOREIGN KEY ("taskId") REFERENCES tasks(id) ON DELETE CASCADE;                   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_allocations ADD CONSTRAINT task_allocations_userId_fkey    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;                   EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_attachments ADD CONSTRAINT task_attachments_taskId_fkey       FOREIGN KEY ("taskId")       REFERENCES tasks(id) ON DELETE CASCADE;          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_attachments ADD CONSTRAINT task_attachments_uploadedById_fkey FOREIGN KEY ("uploadedById") REFERENCES users(id);                            EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_comments   ADD CONSTRAINT task_comments_taskId_fkey           FOREIGN KEY ("taskId")   REFERENCES tasks(id) ON DELETE CASCADE;              EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE task_comments   ADD CONSTRAINT task_comments_authorId_fkey         FOREIGN KEY ("authorId") REFERENCES users(id);                                EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sprints         ADD CONSTRAINT sprints_projectId_fkey           FOREIGN KEY ("projectId")   REFERENCES projects(id)   ON DELETE CASCADE;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE sprints         ADD CONSTRAINT sprints_milestoneId_fkey         FOREIGN KEY ("milestoneId") REFERENCES milestones(id) ON DELETE SET NULL;        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_projectId_fkey            FOREIGN KEY ("projectId")           REFERENCES projects(id)   ON DELETE CASCADE;  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_parentId_fkey             FOREIGN KEY ("parentId")            REFERENCES work_items(id) ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_sprintId_fkey             FOREIGN KEY ("sprintId")            REFERENCES sprints(id)    ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_assigneeId_fkey           FOREIGN KEY ("assigneeId")          REFERENCES users(id)      ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_reporterId_fkey           FOREIGN KEY ("reporterId")          REFERENCES users(id);                        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_responsibleUserId_fkey    FOREIGN KEY ("responsibleUserId")   REFERENCES users(id)      ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_releaseMilestoneId_fkey   FOREIGN KEY ("releaseMilestoneId")  REFERENCES milestones(id) ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_items      ADD CONSTRAINT work_items_affectedMilestoneId_fkey  FOREIGN KEY ("affectedMilestoneId") REFERENCES milestones(id) ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_workItemId_fkey   FOREIGN KEY ("workItemId")   REFERENCES work_items(id) ON DELETE CASCADE;  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_userId_fkey       FOREIGN KEY ("userId")       REFERENCES users(id)      ON DELETE CASCADE;  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_approvedById_fkey FOREIGN KEY ("approvedById") REFERENCES users(id)      ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_comments ADD CONSTRAINT work_item_comments_workItemId_fkey FOREIGN KEY ("workItemId") REFERENCES work_items(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_comments ADD CONSTRAINT work_item_comments_authorId_fkey   FOREIGN KEY ("authorId")   REFERENCES users(id);                       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_activities ADD CONSTRAINT work_item_activities_workItemId_fkey FOREIGN KEY ("workItemId") REFERENCES work_items(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_activities ADD CONSTRAINT work_item_activities_userId_fkey     FOREIGN KEY ("userId")     REFERENCES users(id);                       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_attachments ADD CONSTRAINT work_item_attachments_workItemId_fkey   FOREIGN KEY ("workItemId")   REFERENCES work_items(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE work_item_attachments ADD CONSTRAINT work_item_attachments_uploadedById_fkey FOREIGN KEY ("uploadedById") REFERENCES users(id);                       EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD CONSTRAINT notifications_userId_fkey     FOREIGN KEY ("userId")     REFERENCES users(id)      ON DELETE CASCADE;  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD CONSTRAINT notifications_workItemId_fkey FOREIGN KEY ("workItemId") REFERENCES work_items(id) ON DELETE SET NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE kpi_records   ADD CONSTRAINT kpi_records_userId_fkey      FOREIGN KEY ("userId")      REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE kpi_records   ADD CONSTRAINT kpi_records_enteredById_fkey FOREIGN KEY ("enteredById") REFERENCES users(id);                  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_userId_fkey       FOREIGN KEY ("userId")       REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_approvedById_fkey FOREIGN KEY ("approvedById") REFERENCES users(id);                  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_logs     ADD CONSTRAINT leave_logs_userId_fkey      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE learning_logs  ADD CONSTRAINT learning_logs_userId_fkey   FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE innovation_logs ADD CONSTRAINT innovation_logs_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN others THEN NULL; END $$;

-- ================================================================
-- STEP 6: Indexes
-- ================================================================

CREATE INDEX IF NOT EXISTS users_email_idx                     ON users(email);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx            ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS refresh_tokens_userId_idx           ON refresh_tokens("userId");
CREATE INDEX IF NOT EXISTS projects_status_idx                 ON projects(status);
CREATE INDEX IF NOT EXISTS project_members_projectId_idx       ON project_members("projectId");
CREATE INDEX IF NOT EXISTS milestones_projectId_idx            ON milestones("projectId");
CREATE INDEX IF NOT EXISTS task_lists_projectId_idx            ON task_lists("projectId");
CREATE INDEX IF NOT EXISTS tasks_projectId_idx                 ON tasks("projectId");
CREATE INDEX IF NOT EXISTS tasks_taskListId_idx                ON tasks("taskListId");
CREATE INDEX IF NOT EXISTS tasks_assignedToId_idx              ON tasks("assignedToId");
CREATE INDEX IF NOT EXISTS task_allocations_userId_date_idx    ON task_allocations("userId",date);
CREATE INDEX IF NOT EXISTS task_attachments_taskId_idx         ON task_attachments("taskId");
CREATE INDEX IF NOT EXISTS task_comments_taskId_idx            ON task_comments("taskId");
CREATE INDEX IF NOT EXISTS sprints_projectId_idx               ON sprints("projectId");
CREATE INDEX IF NOT EXISTS sprints_milestoneId_idx             ON sprints("milestoneId");
CREATE INDEX IF NOT EXISTS work_items_projectId_idx            ON work_items("projectId");
CREATE INDEX IF NOT EXISTS work_items_sprintId_idx             ON work_items("sprintId");
CREATE INDEX IF NOT EXISTS work_items_assigneeId_idx           ON work_items("assigneeId");
CREATE INDEX IF NOT EXISTS work_items_parentId_idx             ON work_items("parentId");
CREATE INDEX IF NOT EXISTS timesheet_entries_workItemId_idx    ON timesheet_entries("workItemId");
CREATE INDEX IF NOT EXISTS timesheet_entries_userId_date_idx   ON timesheet_entries("userId",date);
CREATE INDEX IF NOT EXISTS work_item_comments_workItemId_idx   ON work_item_comments("workItemId");
CREATE INDEX IF NOT EXISTS work_item_activities_workItemId_idx ON work_item_activities("workItemId");
CREATE INDEX IF NOT EXISTS work_item_attachments_workItemId_idx ON work_item_attachments("workItemId");
CREATE INDEX IF NOT EXISTS notifications_userId_idx            ON notifications("userId");
CREATE INDEX IF NOT EXISTS kpi_records_userId_period_idx       ON kpi_records("userId",period);
CREATE INDEX IF NOT EXISTS leave_requests_userId_idx           ON leave_requests("userId");
CREATE INDEX IF NOT EXISTS leave_requests_status_idx           ON leave_requests(status);
CREATE INDEX IF NOT EXISTS leave_requests_dates_idx            ON leave_requests("startDate","endDate");
CREATE INDEX IF NOT EXISTS leave_logs_userId_idx               ON leave_logs("userId");
CREATE INDEX IF NOT EXISTS learning_logs_userId_period_idx     ON learning_logs("userId",period);
CREATE INDEX IF NOT EXISTS innovation_logs_userId_period_idx   ON innovation_logs("userId",period);

-- ================================================================
-- Verify — should list all 29 tables
-- ================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
