import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BASE_RATE } from '@/lib/data'
import { Student } from '@/lib/types'

interface StudentCardProps {
  student: Student
  onRemove: (studentId: string) => void
}

export function StudentCard({ student, onRemove }: StudentCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium sm:text-base">{student.name}</span>
        <div className="flex flex-wrap items-center gap-2">
          {student.siblingId ? (
            <>
              <span className="text-xs text-muted-foreground line-through sm:text-sm">
                ${BASE_RATE}
              </span>
              <span className="text-xs font-medium sm:text-sm">
                ${student.monthlyRate}
              </span>
              <Badge variant="secondary" className="text-xs">
                Family Discount
              </Badge>
            </>
          ) : (
            <span className="text-xs font-medium sm:text-sm">
              ${student.monthlyRate}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(student.id)}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
