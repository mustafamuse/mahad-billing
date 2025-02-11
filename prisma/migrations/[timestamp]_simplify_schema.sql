-- Step 1: Add new status field to Student table
ALTER TABLE "Student" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'available';

-- Step 2: Create temporary columns for name parts if needed
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Step 3: Update status based on existing relationships
UPDATE "Student"
SET status = CASE
    WHEN "payorId" IS NOT NULL THEN 'enrolled'
    ELSE 'available'
END;

-- Step 4: Migrate subscription data to student status
UPDATE "Student" s
SET status = 'enrolled'
FROM "Subscription" sub
JOIN "Payor" p ON sub.payorId = p.id
WHERE p.id = s.payorId
AND sub.status = 'ACTIVE';

-- Step 5: Drop unnecessary tables (only after confirming data migration)
-- Note: Keep these commented out until you verify the migration worked
-- DROP TABLE IF EXISTS "Payment";
-- DROP TABLE IF EXISTS "PaymentMethod";
-- DROP TABLE IF EXISTS "Subscription";
-- DROP TABLE IF EXISTS "WebhookEvent";

-- Step 6: Add new fields to Student
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "discountApplied" INTEGER;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "className" TEXT;

-- Step 7: Add isActive to Payer if not exists
ALTER TABLE "Payer" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- Step 8: Add timestamps if they don't exist
ALTER TABLE "Student" 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payer" 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 9: Create trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_updated_at
    BEFORE UPDATE ON "Student"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payer_updated_at
    BEFORE UPDATE ON "Payer"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS "Student_status_idx" ON "Student"("status");
CREATE INDEX IF NOT EXISTS "Student_payorId_idx" ON "Student"("payorId");
CREATE INDEX IF NOT EXISTS "Student_familyId_idx" ON "Student"("familyId"); 