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
    <div className="space-y-4">
      <h3 className="font-semibold">Enrollment Summary</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">
            Students Enrolled
          </span>
          <ul className="space-y-1.5">
            {selectedStudents.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">{student.name}</span>
                <span className="text-muted-foreground">
                  ${student.monthlyRate}/mo
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-base font-medium">Monthly Total</span>
          <div className="text-right">
            <span className="text-xl font-bold">
              ${calculateTotal(selectedStudents)}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">
              per month
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
