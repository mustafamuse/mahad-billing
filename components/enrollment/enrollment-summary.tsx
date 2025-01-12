import { Student } from '@/lib/types'
import { calculateTotal } from '@/lib/utils'

interface EnrollmentSummaryProps {
  selectedStudents: Student[]
}

export function EnrollmentSummary({
  selectedStudents,
}: EnrollmentSummaryProps) {
  if (selectedStudents.length === 0) return null

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total Students Selected</span>
        <span className="font-medium">{selectedStudents.length}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium sm:text-base">
          Your Monthly Tuition Total
        </span>
        <div className="text-right">
          <span className="text-lg font-bold sm:text-xl">
            ${calculateTotal(selectedStudents)}
          </span>
          <span className="block text-xs text-muted-foreground sm:text-sm">
            per month
          </span>
        </div>
      </div>
    </div>
  )
}
