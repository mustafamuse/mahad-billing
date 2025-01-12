import { useState } from 'react'

import { Check, ChevronsUpDown, Search, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Student } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StudentSearchComboboxProps {
  students: Student[]
  isLoading: boolean
  error: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (student: Student) => void
  isStudentSelected: (studentId: string) => boolean
  isStudentEnrolled: (studentId: string) => boolean
}

export function StudentSearchCombobox({
  students,
  isLoading,
  error,
  open,
  onOpenChange,
  onSelect,
  isStudentSelected,
  isStudentEnrolled,
}: StudentSearchComboboxProps) {
  const [searchValue, setSearchValue] = useState('')

  const handleSelect = (student: Student) => {
    onSelect(student)
    setSearchValue('') // Clear search input after selection
    onOpenChange(false) // Close popover after selection
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Search and select students"
          className="h-12 w-full justify-between sm:h-10"
          disabled={isLoading}
        >
          <span className="truncate text-sm text-muted-foreground sm:text-base">
            {isLoading ? 'Loading students...' : 'Search students...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Type a name to search..."
              className="h-12 flex-1 text-base sm:h-11 sm:text-sm"
              value={searchValue}
              onValueChange={setSearchValue}
            />
          </div>
          <CommandEmpty>No student found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto p-1">
            {error ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Failed to load students. Please try again.
              </div>
            ) : (
              students.map((student) => {
                const isSelected = isStudentSelected(student.id)
                const isEnrolled = isStudentEnrolled(student.id)

                return (
                  <CommandItem
                    key={student.id}
                    onSelect={() => !isEnrolled && handleSelect(student)}
                    className={cn(
                      'px-2 py-3 text-base sm:py-2 sm:text-sm',
                      isEnrolled && 'cursor-not-allowed opacity-50'
                    )}
                    disabled={isEnrolled}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{student.name}</span>
                      </div>

                      {isEnrolled && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">
                                  Already Enrolled
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                This student is already enrolled in the program
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </CommandItem>
                )
              })
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
