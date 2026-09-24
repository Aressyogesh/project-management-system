-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" VARCHAR(200) NOT NULL DEFAULT '',
    "webAddress" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "zipCode" VARCHAR(20),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "backDateLogValue" INTEGER NOT NULL DEFAULT 8,
    "backDateLogUnit" VARCHAR(10) NOT NULL DEFAULT 'Days',
    "emailDomains" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dateFormat" VARCHAR(20) NOT NULL DEFAULT 'DD-MM-YYYY',
    "timeFormat" VARCHAR(4) NOT NULL DEFAULT '24',
    "taskDurationIn" VARCHAR(10) NOT NULL DEFAULT 'hours',
    "firstDayOfWeek" VARCHAR(10) NOT NULL DEFAULT 'Monday',
    "businessHoursStart" VARCHAR(6) NOT NULL DEFAULT '10:00',
    "businessHoursStartPeriod" VARCHAR(2) NOT NULL DEFAULT 'AM',
    "businessHoursEnd" VARCHAR(6) NOT NULL DEFAULT '07:00',
    "businessHoursEndPeriod" VARCHAR(2) NOT NULL DEFAULT 'PM',
    "workingDays" JSONB NOT NULL DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_config_pkey" PRIMARY KEY ("id")
);
