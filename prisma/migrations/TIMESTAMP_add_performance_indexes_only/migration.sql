-- Add performance indexes without touching existing schema
CREATE INDEX IF NOT EXISTS "Student_siblingGroupId_idx" ON "Student"("siblingGroupId");
CREATE INDEX IF NOT EXISTS "Student_batchId_idx" ON "Student"("batchId");
CREATE INDEX IF NOT EXISTS "Student_name_idx" ON "Student"("name");
CREATE INDEX IF NOT EXISTS "Student_email_idx" ON "Student"("email");
CREATE INDEX IF NOT EXISTS "Student_updatedAt_idx" ON "Student"("updatedAt");
CREATE INDEX IF NOT EXISTS "Student_createdAt_status_idx" ON "Student"("createdAt", "status");

-- Add indexes for Sibling and Batch
CREATE INDEX IF NOT EXISTS "Sibling_updatedAt_idx" ON "Sibling"("updatedAt");
CREATE INDEX IF NOT EXISTS "Batch_startDate_idx" ON "Batch"("startDate");
CREATE INDEX IF NOT EXISTS "Batch_endDate_idx" ON "Batch"("endDate");
CREATE INDEX IF NOT EXISTS "Batch_createdAt_idx" ON "Batch"("createdAt"); 