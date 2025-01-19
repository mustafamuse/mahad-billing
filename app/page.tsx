import React from 'react'

import { EnrollmentForm } from '../components/enrollment-form'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <EnrollmentForm />
      </div>
    </main>
  )
}
