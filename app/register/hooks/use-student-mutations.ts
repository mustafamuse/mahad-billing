import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  updateRegistrationStudent,
  addSibling,
  removeSibling,
} from '@/lib/actions/register'

import { queryKeys } from './query-keys'
import type {
  StudentWithSiblings,
  StudentMutationResponse,
  UpdateStudentVariables,
  ManageSiblingVariables,
  QueryContext,
} from '../types'

export function useStudentMutations() {
  const queryClient = useQueryClient()

  const updateStudent = useMutation<
    StudentMutationResponse,
    Error,
    UpdateStudentVariables,
    QueryContext
  >({
    mutationFn: (data) =>
      updateRegistrationStudent(data.id, {
        name: `${data.values.firstName} ${data.values.lastName}`.trim(),
        email: data.values.email,
        phone: data.values.phone,
        dateOfBirth: data.values.dateOfBirth,
        educationLevel: data.values.educationLevel,
        gradeLevel: data.values.gradeLevel,
        schoolName: data.values.schoolName,
      }),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.student(newData.id),
      })
      await queryClient.cancelQueries({
        queryKey: queryKeys.students,
      })

      const previousStudent = queryClient.getQueryData(
        queryKeys.student(newData.id)
      ) as StudentWithSiblings | undefined
      const previousStudents = queryClient.getQueryData(queryKeys.students) as
        | StudentWithSiblings[]
        | undefined

      const optimisticStudent = {
        ...(previousStudent as StudentWithSiblings),
        name: `${newData.values.firstName} ${newData.values.lastName}`.trim(),
        email: newData.values.email,
        phone: newData.values.phone,
        dateOfBirth: newData.values.dateOfBirth,
        educationLevel: newData.values.educationLevel,
        gradeLevel: newData.values.gradeLevel,
        schoolName: newData.values.schoolName,
      }

      queryClient.setQueryData(queryKeys.student(newData.id), optimisticStudent)

      if (previousStudents) {
        queryClient.setQueryData(
          queryKeys.students,
          previousStudents.map((s) =>
            s.id === newData.id ? optimisticStudent : s
          )
        )
      }

      return { previousStudent, previousStudents }
    },
    onError: (error, newData, context) => {
      queryClient.setQueryData(
        queryKeys.student(newData.id),
        context?.previousStudent
      )
      queryClient.setQueryData(queryKeys.students, context?.previousStudents)

      if (error.message.includes('not found')) {
        toast.error('Student not found. They may have been removed.')
        return
      }

      toast.error(error.message || 'Failed to update student information')
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['students'],
        refetchType: 'active',
      })

      if (data.student) {
        queryClient.invalidateQueries({
          queryKey: ['student', data.student.id],
          exact: true,
        })
      }

      toast.success('Changes saved successfully')
    },
  })

  const manageSiblings = useMutation<
    StudentMutationResponse,
    Error,
    ManageSiblingVariables,
    QueryContext
  >({
    mutationFn: ({ type, studentId, siblingId }) =>
      type === 'add'
        ? addSibling(studentId, siblingId)
        : removeSibling(studentId, siblingId),
    onMutate: async ({ type, studentId, siblingId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.student(studentId),
      })
      await queryClient.cancelQueries({
        queryKey: queryKeys.students,
      })

      const previousStudent = queryClient.getQueryData(
        queryKeys.student(studentId)
      ) as StudentWithSiblings | undefined
      const previousStudents = queryClient.getQueryData(queryKeys.students) as
        | StudentWithSiblings[]
        | undefined

      const siblingInfo = previousStudents?.find((s) => s.id === siblingId)

      if (type === 'add') {
        const optimisticUpdate = {
          ...(previousStudent as StudentWithSiblings),
          siblingGroup: {
            ...previousStudent?.siblingGroup,
            students: [
              ...(previousStudent?.siblingGroup?.students || []),
              {
                id: siblingId,
                name: siblingInfo?.name || 'Loading...',
              },
            ],
          },
        }

        queryClient.setQueryData(queryKeys.student(studentId), optimisticUpdate)

        if (previousStudents) {
          queryClient.setQueryData(
            queryKeys.students,
            previousStudents.map((s) =>
              s.id === studentId ? optimisticUpdate : s
            )
          )
        }
      } else {
        const optimisticUpdate = {
          ...(previousStudent as StudentWithSiblings),
          siblingGroup: {
            ...previousStudent?.siblingGroup,
            students: previousStudent?.siblingGroup?.students.filter(
              (s) => s.id !== siblingId
            ),
          },
        }

        queryClient.setQueryData(queryKeys.student(studentId), optimisticUpdate)

        if (previousStudents) {
          queryClient.setQueryData(
            queryKeys.students,
            previousStudents.map((s) =>
              s.id === studentId ? optimisticUpdate : s
            )
          )
        }
      }

      return { previousStudent, previousStudents }
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        queryKeys.student(variables.studentId),
        context?.previousStudent
      )
      queryClient.setQueryData(queryKeys.students, context?.previousStudents)

      if (error.message.includes('not found')) {
        toast.error(
          'One or both students not found. Please refresh and try again.'
        )
        return
      }

      toast.error(
        variables.type === 'add'
          ? 'Failed to add sibling. Please try again.'
          : 'Failed to remove sibling. Please try again.'
      )
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['students'],
        refetchType: 'active',
      })

      if (data.student?.id) {
        queryClient.invalidateQueries({
          queryKey: ['student', data.student.id],
          exact: true,
        })
        queryClient.invalidateQueries({
          queryKey: ['student', variables.siblingId],
          exact: true,
        })
      }

      const message =
        variables.type === 'add'
          ? 'Sibling added successfully'
          : 'Sibling removed successfully'
      toast.success(message)
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  return {
    updateStudent,
    manageSiblings,
  }
}
