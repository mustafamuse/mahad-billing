'use client'

import React, { Suspense } from 'react'

import PaymentSuccessContent from './payment-success-content'

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
