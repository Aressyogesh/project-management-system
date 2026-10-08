-- Add QA value to BugFlag enum (between INTERNAL and UAT)
ALTER TYPE "BugFlag" ADD VALUE IF NOT EXISTS 'QA' AFTER 'INTERNAL';
