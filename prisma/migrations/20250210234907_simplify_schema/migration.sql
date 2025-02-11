/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Payor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Payor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Payor` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Subscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- AlterTable
ALTER TABLE "Payor" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "canceledAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payor_email_key" ON "Payor"("email");
