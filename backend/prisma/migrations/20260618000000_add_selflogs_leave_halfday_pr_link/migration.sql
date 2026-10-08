-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_selflogs_leave_halfday_pr_link
-- Captures all schema changes that were applied via `prisma db push` but had
-- no migration files, causing production deploys to skip them.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. LearningLog table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "learning_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "period"      VARCHAR(7) NOT NULL,
    "topic"       VARCHAR(200) NOT NULL,
    "hours"       DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(500),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learning_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "learning_logs_userId_idx" ON "learning_logs"("userId");

ALTER TABLE "learning_logs"
    DROP CONSTRAINT IF EXISTS "learning_logs_userId_fkey";
ALTER TABLE "learning_logs"
    ADD CONSTRAINT "learning_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 2. InnovationLog table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "innovation_logs" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "period"    VARCHAR(7) NOT NULL,
    "title"     VARCHAR(200) NOT NULL,
    "impact"    VARCHAR(500) NOT NULL,
    "type"      VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "innovation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "innovation_logs_userId_idx" ON "innovation_logs"("userId");

ALTER TABLE "innovation_logs"
    DROP CONSTRAINT IF EXISTS "innovation_logs_userId_fkey";
ALTER TABLE "innovation_logs"
    ADD CONSTRAINT "innovation_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. LeaveLog table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "leave_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "date"        DATE NOT NULL,
    "type"        VARCHAR(20) NOT NULL,
    "description" VARCHAR(200),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_logs_userId_idx" ON "leave_logs"("userId");

ALTER TABLE "leave_logs"
    DROP CONSTRAINT IF EXISTS "leave_logs_userId_fkey";
ALTER TABLE "leave_logs"
    ADD CONSTRAINT "leave_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 4. leave_requests — half-day leave support ───────────────────────────────
-- Change totalDays from INT to DOUBLE PRECISION to support 0.5 days
ALTER TABLE "leave_requests"
    ALTER COLUMN "totalDays" TYPE DOUBLE PRECISION;

-- Add isHalfDay flag
ALTER TABLE "leave_requests"
    ADD COLUMN IF NOT EXISTS "isHalfDay" BOOLEAN NOT NULL DEFAULT false;

-- ── 5. work_items — GitHub PR link columns ───────────────────────────────────
ALTER TABLE "work_items"
    ADD COLUMN IF NOT EXISTS "prUrl"    VARCHAR(500),
    ADD COLUMN IF NOT EXISTS "prNumber" INTEGER,
    ADD COLUMN IF NOT EXISTS "prState"  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "prTitle"  VARCHAR(200);
