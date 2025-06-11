/*
  Warnings:

  - A unique constraint covering the columns `[stripeInvoiceId]` on the table `StudentPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StudentPayment_unique";

-- AlterTable
ALTER TABLE "StudentPayment" ADD COLUMN     "stripeInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudentPayment_stripeInvoiceId_key" ON "StudentPayment"("stripeInvoiceId");
