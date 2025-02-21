'use client'

import { EnrollmentForm } from './(enrollment)/enrollment-form'

export default function AutopayPage() {
  return (
    <div className="container relative px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <EnrollmentForm />
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
