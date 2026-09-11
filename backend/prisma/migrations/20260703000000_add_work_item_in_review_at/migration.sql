-- Add inReviewAt to work_items to track when a card first enters the IN_REVIEW column
-- Used for Delivery Timeliness KPI: "on time" = inReviewAt <= dueDate
ALTER TABLE "work_items" ADD COLUMN "inReviewAt" TIMESTAMP(3);
