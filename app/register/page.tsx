import { Metadata } from 'next'

import { RegisterForm } from './components/register-form'
import { Providers } from './providers'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Student Registration',
  description:
    'Update your student information and manage sibling relationships.',
}

export default async function RegisterPage() {
  return (
    <Providers>
      <main className="container mx-auto min-h-screen px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <header className="mb-8 space-y-2 text-center">
            <h1 className="text-3xl font-bold">Student Registration</h1>
            <p className="text-muted-foreground">
              Please fill out the form below to register for the Mahad
            </p>
          </header>
          <RegisterForm />
        </div>
      </main>
    </Providers>
  )
}
