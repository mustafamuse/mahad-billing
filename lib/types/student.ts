export enum StudentStatus {
  REGISTERED = 'registered', // Initial state, not yet in classes
  ENROLLED = 'enrolled', // Actively attending classes
  ON_LEAVE = 'on_leave', // Temporary approved break
  WITHDRAWN = 'withdrawn', // No longer attending
}

// Helper function to check if a status is valid
export function isValidStudentStatus(status: string): status is StudentStatus {
  return Object.values(StudentStatus).includes(status as StudentStatus)
}

// Helper function to get the display name of a status
export function getStudentStatusDisplay(status: StudentStatus): string {
  switch (status) {
    case StudentStatus.REGISTERED:
      return 'Registered'
    case StudentStatus.ENROLLED:
      return 'Enrolled'
    case StudentStatus.ON_LEAVE:
      return 'On Leave'
    case StudentStatus.WITHDRAWN:
      return 'Withdrawn'
    default:
      return 'Unknown'
  }
}
