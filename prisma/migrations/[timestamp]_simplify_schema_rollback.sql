-- Rollback Step 1: Remove indexes
DROP INDEX IF EXISTS "Student_status_idx";
DROP INDEX IF EXISTS "Student_payorId_idx";
DROP INDEX IF EXISTS "Student_familyId_idx";

-- Rollback Step 2: Remove triggers
DROP TRIGGER IF EXISTS update_student_updated_at ON "Student";
DROP TRIGGER IF EXISTS update_payer_updated_at ON "Payer";
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Rollback Step 3: Remove new columns from Student
ALTER TABLE "Student" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "discountApplied";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "className";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "lastName";

-- Rollback Step 4: Remove new columns from Payer
ALTER TABLE "Payer" DROP COLUMN IF EXISTS "isActive";

-- Note: Timestamps are kept for data integrity 