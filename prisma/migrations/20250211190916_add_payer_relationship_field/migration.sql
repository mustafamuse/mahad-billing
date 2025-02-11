/*
  Warnings:

  - You are about to drop the column `relationship` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payer" ADD COLUMN     "relationship" TEXT;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "relationship";
