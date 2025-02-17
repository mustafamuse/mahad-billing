export const queryKeys = {
  students: ['students'] as const,
  student: (id: string) => ['student', id] as const,
  siblings: (studentId: string) => ['student', studentId, 'siblings'] as const,
}
