/*
  Warnings:

  - You are about to drop the column `cancelReason` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `canceledAt` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "lastPaymentDate" TIMESTAMP(3),
ADD COLUMN     "nextPaymentDue" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "cancelReason",
DROP COLUMN "canceledAt";

-- Update Student status field
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_status_check";
ALTER TABLE "Student" ALTER COLUMN "status" SET DEFAULT 'registered';

-- Create enum check constraint for Student status
ALTER TABLE "Student" ADD CONSTRAINT "Student_status_check" 
  CHECK (status IN ('registered', 'enrolled', 'on_leave', 'withdrawn'));

-- Migrate existing data
UPDATE "Student"
SET status = CASE 
    WHEN status = 'available' THEN 'registered'
    WHEN status = 'inactive' THEN 'withdrawn'
    WHEN status = 'past_due' THEN 'enrolled'
    ELSE status
END;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Student_status_idx" ON "Student"("status");

-- Update the schema version
INSERT INTO "_prisma_migrations" (checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES ('e94b98bbc32df9b0671a8e0eb3cad7c0', NOW(), '20250211050439_init', NULL, NULL, NOW(), 1);
