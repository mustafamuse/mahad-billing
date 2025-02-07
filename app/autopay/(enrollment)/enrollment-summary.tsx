import { UserPlus2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Student } from '@/lib/types'
import { calculateTotal } from '@/lib/utils'

interface EnrollmentSummaryProps {
  selectedStudents: Student[]
  onAddStudents?: () => void
}

export function EnrollmentSummary({
  selectedStudents,
  onAddStudents,
}: EnrollmentSummaryProps) {
  const hasStudents = selectedStudents.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Enrollment Summary</h3>
        {hasStudents && onAddStudents && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary"
            onClick={onAddStudents}
          >
            <UserPlus2 className="mr-1 h-4 w-4" /> Enroll More
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">
            Students Enrolled
          </span>
          {hasStudents ? (
            <ul className="space-y-1.5">
              {selectedStudents.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{student.name}</span>
                  <span className="font-medium tabular-nums text-primary">
                    ${student.monthlyRate}/mo
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed py-8 text-center">
              <UserPlus2 className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                No students selected
              </p>
              {onAddStudents && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 h-8 text-primary"
                  onClick={onAddStudents}
                >
                  Select Students
                </Button>
              )}
            </div>
          )}
        </div>

        {hasStudents && (
          <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-3">
            <span className="text-base font-medium">Monthly Total</span>
            <div className="text-right">
              <span className="text-xl font-bold tabular-nums text-primary">
                ${calculateTotal(selectedStudents)}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">
                per month
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
