CREATE TABLE "late_coming_logs" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "date"         DATE NOT NULL,
  "minutesLate"  INTEGER NOT NULL,
  "reason"       VARCHAR(500),
  "recordedById" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "late_coming_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "late_coming_logs_userId_idx" ON "late_coming_logs"("userId");
CREATE INDEX "late_coming_logs_date_idx" ON "late_coming_logs"("date");

ALTER TABLE "late_coming_logs" ADD CONSTRAINT "late_coming_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_coming_logs" ADD CONSTRAINT "late_coming_logs_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
