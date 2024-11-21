import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Student } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFamilyDiscount(totalFamilyMembers: number): number {
  if (totalFamilyMembers >= 4) return 30;
  if (totalFamilyMembers === 3) return 20;
  if (totalFamilyMembers === 2) return 10;
  return 0;
}

export function calculateTotal(students: Student[]): number {
  return students.reduce((total, student) => {
    const { price } = calculateStudentPrice(student);
    return total + price;
  }, 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateStudentPrice(
  student: Student
): {
  price: number;
  discount: number;
  isSiblingDiscount: boolean;
} {
  const basePrice = student.monthlyRate;

  // If student has no family, return base price
  if (!student.familyId || !student.totalFamilyMembers) {
    return {
      price: basePrice,
      discount: 0,
      isSiblingDiscount: false,
    };
  }

  // Calculate discount based on total family members
  const familyDiscount = getFamilyDiscount(student.totalFamilyMembers);
  const price = basePrice - familyDiscount;

  return {
    price,
    discount: familyDiscount,
    isSiblingDiscount: true,
  };
}