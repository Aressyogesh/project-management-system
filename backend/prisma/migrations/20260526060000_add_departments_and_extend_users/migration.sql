-- CreateTable: departments
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: departments.name unique
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- AlterTable: users — add new optional columns
ALTER TABLE "users"
    ADD COLUMN "phone"        VARCHAR(20),
    ADD COLUMN "joinDate"     DATE,
    ADD COLUMN "profilePhoto" TEXT,
    ADD COLUMN "departmentId" TEXT,
    ADD COLUMN "shiftId"      TEXT;

-- AddForeignKey: users.departmentId → departments.id
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: users.shiftId → shifts.id
ALTER TABLE "users" ADD CONSTRAINT "users_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "shifts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
