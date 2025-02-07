import { GraduationCap } from 'lucide-react'

export function EnrollmentHeader() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16">
        <div className="mb-8 flex flex-col items-center text-center">
          <GraduationCap className="mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-3 text-4xl font-bold">
            Set Up Your Tuition Payment
          </h1>
          <p className="max-w-[42rem] text-muted-foreground">
            Welcome to Roots of Knowledge's tuition payment portal. Use this app
            to set up your monthly tuition payments easily and securely. Simply
            select your name and complete the payment process.
          </p>
        </div>
      </div>
    </>
  )
}
