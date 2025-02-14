'use client'

import { useState } from 'react'

import { Search } from 'lucide-react'

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
import { RegisterStudent } from '@/lib/actions/register'

interface StudentSearchProps {
  students: RegisterStudent[]
  selectedStudent: RegisterStudent | null
  onSelect: (student: RegisterStudent) => void
}

export function StudentSearch({
  students,
  selectedStudent,
  onSelect,
}: StudentSearchProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative w-full">
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
        <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
          <Command className="w-full">
            <CommandInput placeholder="Search by name..." className="h-9" />
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              <CommandList>
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    onSelect={() => {
                      onSelect(student)
                      setOpen(false)
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
    </div>
  )
}
