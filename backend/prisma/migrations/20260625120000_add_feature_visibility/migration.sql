-- CreateTable
CREATE TABLE "feature_visibility" (
    "id" TEXT NOT NULL,
    "feature" VARCHAR(50) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feature_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_visibility_feature_role_key" ON "feature_visibility"("feature", "role");

-- Seed defaults: SUPER_USER always visible, ADMIN visible, EMPLOYEE hidden
INSERT INTO "feature_visibility" ("id", "feature", "role", "visible") VALUES
  (gen_random_uuid(), 'KPI',     'SUPER_USER', true),
  (gen_random_uuid(), 'KPI',     'ADMIN',      true),
  (gen_random_uuid(), 'KPI',     'EMPLOYEE',   false),
  (gen_random_uuid(), 'REPORTS', 'SUPER_USER', true),
  (gen_random_uuid(), 'REPORTS', 'ADMIN',      true),
  (gen_random_uuid(), 'REPORTS', 'EMPLOYEE',   false);
