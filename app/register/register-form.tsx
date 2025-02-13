'use client'

import { useEffect, useState } from 'react'

import { EducationLevel, GradeLevel } from '@prisma/client'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// import { DirtyStateBanner } from './dirty-state-banner'
import { StudentInfoFields } from './student-info-fields'

interface RegisterStudent {
  id: string
  name: string
  email: string | null
  phone: string | null
  schoolName: string | null
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
  dateOfBirth: string | null
  siblingGroup: {
    students: {
      id: string
      name: string
    }[]
  } | null
}

export function RegisterForm() {
  const [selectedStudent, setSelectedStudent] =
    useState<RegisterStudent | null>(null)
  const [students, setStudents] = useState<RegisterStudent[]>([])
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formValues, setFormValues] = useState<any>(null)

  // Fetch students
  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await fetch('/api/register/students')
        if (!response.ok) throw new Error('Failed to fetch students')
        const data = await response.json()
        setStudents(data.students)
      } catch (err) {
        console.error('Failed to fetch students:', err)
        toast.error('Failed to load students')
      }
    }
    fetchStudents()
  }, [])

  const handleFormUpdate = async (values: any) => {
    if (!selectedStudent) return
    setHasChanges(true)
    // Store the values for submission
    setFormValues(values)
  }

  const handleSubmit = async () => {
    if (!selectedStudent || !formValues) return

    try {
      setIsSubmitting(true)
      const response = await fetch(
        `/api/register/students/${selectedStudent.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update')
      }

      toast.success('Information updated successfully')
      setHasChanges(false)

      // Refresh student data
      const updatedResponse = await fetch('/api/register/students')
      if (updatedResponse.ok) {
        const data = await updatedResponse.json()
        setStudents(data.students)
        // Update selected student with new data
        const updated = data.students.find(
          (s: RegisterStudent) => s.id === selectedStudent.id
        )
        if (updated) setSelectedStudent(updated)
      }
    } catch (err) {
      console.error('Failed to update:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update information'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Transform the student data for the form
  const getFormInitialValues = (student: RegisterStudent) => ({
    ...student,
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
  })

  return (
    <div className="space-y-6">
      {/* {hasChanges && <DirtyStateBanner />} */}

      {/* Student Search */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedStudent ? selectedStudent.name : 'Search for your name...'}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search by name..." />
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              <CommandList>
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    onSelect={() => {
                      setSelectedStudent(student)
                      setOpen(false)
                      setHasChanges(false)
                    }}
                  >
                    {student.name}
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedStudent ? (
        <div className="space-y-6">
          <StudentInfoFields
            initialValues={getFormInitialValues(selectedStudent)}
            onUpdate={handleFormUpdate}
          />

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedStudent(null)
                setHasChanges(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No Student Selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please search and select your name to update your information
          </p>
        </div>
      )}
    </div>
  )
}
