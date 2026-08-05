-- CreateTable: KpiNote (multiple notes per metric per user per period, entered by PM)
CREATE TABLE "kpi_notes" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "metricId"  VARCHAR(50) NOT NULL,
    "period"    VARCHAR(7) NOT NULL,
    "content"   TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_notes_userId_metricId_period_idx" ON "kpi_notes"("userId", "metricId", "period");

-- AddForeignKey
ALTER TABLE "kpi_notes" ADD CONSTRAINT "kpi_notes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_notes" ADD CONSTRAINT "kpi_notes_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
