-- F-034: User Activity Audit Log
-- Creates AuditAction enum, AuditEntity enum, and audit_logs table

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM (
    'LOGIN',
    'WORK_ITEM_CREATED',
    'WORK_ITEM_UPDATED',
    'WORK_ITEM_STATUS_CHANGED',
    'WORK_ITEM_DELETED',
    'WORK_ITEM_ASSIGNED',
    'SPRINT_CREATED',
    'SPRINT_UPDATED',
    'SPRINT_ACTIVATED',
    'SPRINT_DELETED',
    'MEMBER_ADDED',
    'MEMBER_REMOVED',
    'MEMBER_ROLE_CHANGED',
    'PROFILE_UPDATED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuditEntity" AS ENUM (
    'AUTH',
    'WORK_ITEM',
    'SPRINT',
    'PROJECT_MEMBER',
    'USER_PROFILE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT          NOT NULL,
  "action"      "AuditAction" NOT NULL,
  "entity"      "AuditEntity" NOT NULL,
  "entityId"    VARCHAR(100),
  "entityTitle" VARCHAR(300),
  "projectId"   TEXT,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx"    ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx"    ON "audit_logs"("entity");
CREATE INDEX IF NOT EXISTS "audit_logs_projectId_idx" ON "audit_logs"("projectId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
