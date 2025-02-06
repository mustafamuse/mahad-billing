import { EnrollmentForm } from '@/app/autopay/(enrollment)/enrollment-form'
import { getStudents } from '@/lib/actions/get-students'

export default async function AutoPayPage() {
  const students = await getStudents()
  return <EnrollmentForm students={students} />
}
