'use client'

import { useState } from 'react'

import { Check, ChevronsUpDown, Search } from 'lucide-react'

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
import { RegisterStudent } from '@/lib/actions/register'
import { cn } from '@/lib/utils'

interface StudentSearchProps {
  students: RegisterStudent[]
  selectedStudent: RegisterStudent | null
  onSelect: (student: RegisterStudent) => void
  placeholder?: string
  emptyMessage?: string
}

export function StudentSearch({
  students,
  selectedStudent,
  onSelect,
  placeholder = 'Search...',
  emptyMessage = 'No results found.',
}: StudentSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const handleSelect = (student: RegisterStudent) => {
    onSelect(student)
    setSearchValue('') // Clear search input after selection
    setOpen(false) // Close popover after selection
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Search and select your name"
          className="h-12 w-full justify-between sm:h-10"
        >
          <span className="truncate text-sm text-muted-foreground sm:text-base">
            {selectedStudent ? selectedStudent.name : 'Search for your name...'}
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
              placeholder={placeholder}
              className="h-12 flex-1 text-base sm:h-11 sm:text-sm"
              value={searchValue}
              onValueChange={setSearchValue}
            />
          </div>
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto p-1">
            {students.map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => handleSelect(student)}
                className="px-2 py-3 text-base sm:py-2 sm:text-sm"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selectedStudent?.id === student.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{student.name}</span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
