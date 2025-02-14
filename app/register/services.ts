import { StudentFormValues } from './schema'

export const studentService = {
  updateStudent: async (studentId: string, data: StudentFormValues) => {
    const response = await fetch(`/api/register/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update')
    }
    return response.json()
  },

  getStudents: async () => {
    const response = await fetch('/api/register/students')
    if (!response.ok) throw new Error('Failed to fetch students')
    return response.json()
  },
}
