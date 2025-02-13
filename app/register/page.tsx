import { Metadata } from 'next'

import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Student Registration - Irshād 4',
  description:
    'Update your student information and manage sibling relationships.',
}

export default async function RegisterPage() {
  return (
    <main className="container mx-auto min-h-screen px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-3xl font-bold">Student Registration</h1>
          <p className="text-muted-foreground">
            Search for your name to view and update your information
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  )
}
