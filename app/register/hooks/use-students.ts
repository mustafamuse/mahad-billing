import { useQuery } from '@tanstack/react-query'

import {
  getRegistrationStudents,
  getRegistrationStudent,
} from '@/lib/actions/register'

import type { StudentWithSiblings } from '../types'
import { queryKeys } from './query-keys'

export function useStudents(initialData?: StudentWithSiblings[]) {
  return useQuery<StudentWithSiblings[]>({
    queryKey: queryKeys.students,
    queryFn: getRegistrationStudents,
    initialData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  })
}

export function useStudent(id: string, initialData?: StudentWithSiblings) {
  return useQuery<StudentWithSiblings>({
    queryKey: queryKeys.student(id),
    queryFn: async () => {
      const student = await getRegistrationStudent(id)
      if (!student) throw new Error('Student not found')
      return student
    },
    initialData,
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 5,
  })
}
