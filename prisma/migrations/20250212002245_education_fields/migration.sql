/*
  Warnings:

  - You are about to drop the column `className` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `discountApplied` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `familyId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `ClassGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FamilyGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ClassGroupToStudent` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'COLLEGE', 'POST_GRAD');

-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR');

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_familyId_fkey";

-- DropForeignKey
ALTER TABLE "_ClassGroupToStudent" DROP CONSTRAINT "_ClassGroupToStudent_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClassGroupToStudent" DROP CONSTRAINT "_ClassGroupToStudent_B_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "className",
DROP COLUMN "discountApplied",
DROP COLUMN "familyId",
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "collegeGradYear" INTEGER,
ADD COLUMN     "collegeGraduated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "educationLevel" "EducationLevel",
ADD COLUMN     "gradeLevel" "GradeLevel",
ADD COLUMN     "highSchoolGradYear" INTEGER,
ADD COLUMN     "highSchoolGraduated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postGradCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postGradYear" INTEGER,
ADD COLUMN     "schoolName" TEXT,
ADD COLUMN     "siblingGroupId" TEXT;

-- DropTable
DROP TABLE "ClassGroup";

-- DropTable
DROP TABLE "FamilyGroup";

-- DropTable
DROP TABLE "_ClassGroupToStudent";

-- CreateTable
CREATE TABLE "Sibling" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sibling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_siblingGroupId_fkey" FOREIGN KEY ("siblingGroupId") REFERENCES "Sibling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
