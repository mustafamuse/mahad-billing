import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  updateRegistrationStudent,
  addSibling,
  removeSibling,
  createRegistrationStudent,
} from '@/lib/actions/register'

import { queryKeys } from './query-keys'
import type {
  StudentWithSiblings,
  StudentMutationResponse,
  UpdateStudentVariables,
  ManageSiblingVariables,
  QueryContext,
  StudentFormValues,
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
        queryKey: queryKeys.students,
        refetchType: 'active',
      })

      const previousStudents = queryClient.getQueryData(queryKeys.students) as
        | StudentWithSiblings[]
        | undefined
      if (previousStudents && data.student) {
        queryClient.setQueryData(
          queryKeys.students,
          previousStudents.map((s) =>
            s.id === data.student!.id ? data.student : s
          )
        )
      }

      if (data.student) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.student(data.student.id),
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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.student(studentId),
      })
      await queryClient.cancelQueries({
        queryKey: queryKeys.students,
      })

      // Snapshot previous values
      const previousStudent = queryClient.getQueryData(
        queryKeys.student(studentId)
      ) as StudentWithSiblings | undefined
      const previousStudents = queryClient.getQueryData(queryKeys.students) as
        | StudentWithSiblings[]
        | undefined

      const siblingInfo = previousStudents?.find((s) => s.id === siblingId)

      // Optimistically update
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
      // Revert optimistic updates on error
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
      // Update cache with server data
      if (data.student) {
        queryClient.setQueryData(
          queryKeys.student(data.student.id),
          data.student
        )
      }

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.students,
      })

      toast.success(
        variables.type === 'add'
          ? 'Sibling added to your profile'
          : 'Sibling removed from your profile'
      )
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const createStudent = useMutation<
    StudentMutationResponse,
    Error,
    StudentFormValues
  >({
    mutationFn: (values) => createRegistrationStudent(values),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.students,
        refetchType: 'active',
      })

      const previousStudents = queryClient.getQueryData(queryKeys.students) as
        | StudentWithSiblings[]
        | undefined
      if (data.student) {
        queryClient.setQueryData(
          queryKeys.students,
          previousStudents
            ? [...previousStudents, data.student]
            : [data.student]
        )
      }

      toast.success('You have successfully registered! 🎉')
    },
    onError: (error) => {
      if (error.message.includes('already exists')) {
        toast.error('A student with this email already exists')
        return
      }
      toast.error('Failed to create registration. Please try again.')
    },
  })

  return {
    updateStudent,
    manageSiblings,
    createStudent,
  }
}
