/*
  Warnings:

  - A unique constraint covering the columns `[studentId,stripeInvoiceId]` on the table `StudentPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StudentPayment_stripeInvoiceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "StudentPayment_studentId_stripeInvoiceId_key" ON "StudentPayment"("studentId", "stripeInvoiceId");
