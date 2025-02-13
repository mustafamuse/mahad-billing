// Utility: Get family discount based on number of family members
export function getFamilyDiscount(totalFamilyMembers: number): number {
  if (totalFamilyMembers >= 4) return 30

  if (totalFamilyMembers >= 3) return 20
  if (totalFamilyMembers === 2) return 10
  return 0
}

// Utility: Calculate total monthly rate for students
// export function calculateTotal(students: Student[]): number {
//   return students.reduce((total, student) => {
//     const { price } = calculateStudentPrice(student)
//     return total + price
//   }, 0)
// }

// // Utility: Calculate student price with discounts
// export function calculateStudentPrice(student: Student) {
//   const basePrice = BASE_RATE
//   const hasSiblingDiscount = student.siblings > 0 || false
//   const discount = hasSiblingDiscount ? getFamilyDiscount(2) : 0

//   const price = basePrice - basePrice * (discount / 100)

//   return {
//     price,
//     discount,
//     hasSiblingDiscount,
//   }
// }

// Utility: Get billing cycle anchor timestamp
export function getBillingCycleAnchor(dayOfMonth: number = 1): number {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Create date for next billing cycle
  const billingDate = new Date(currentYear, currentMonth + 1, dayOfMonth)

  // If the billing date would be in the past, move to next month
  if (billingDate.getTime() <= now.getTime()) {
    billingDate.setMonth(billingDate.getMonth() + 1)
  }

  return Math.floor(billingDate.getTime() / 1000) // Convert to Unix timestamp
}
