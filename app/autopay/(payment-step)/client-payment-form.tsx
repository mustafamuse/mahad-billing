'use client'

import { useMemo } from 'react'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { LockIcon, ShieldCheck } from 'lucide-react'

import { EnrollmentSummary } from '@/app/autopay/(enrollment)/enrollment-summary'
import { StripePaymentForm } from '@/app/autopay/(payment-step)/stripe-payment-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PayorDetails, type Student } from '@/lib/types'

// Get the publishable key from env
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!publishableKey) {
  throw new Error('Stripe publishable key is not set in environment variables')
}

interface ClientPaymentFormProps {
  clientSecret: string
  payorDetails: PayorDetails
  selectedStudents: Student[]
  onAddStudents: () => void
}

export function ClientPaymentForm({
  clientSecret,
  payorDetails,
  selectedStudents,
  onAddStudents,
}: ClientPaymentFormProps) {
  // Memoize the Stripe promise
  const stripePromise = useMemo(() => loadStripe(publishableKey!), [])

  return (
    <Card className="relative">
      <div className="absolute right-4 top-4 flex items-center text-sm text-muted-foreground">
        <LockIcon className="mr-1 h-4 w-4" />
        Secure Payment
      </div>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription className="mt-2">
          Set up automatic monthly tuition payments from your bank account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-card p-4">
          <EnrollmentSummary
            selectedStudents={selectedStudents}
            onAddStudents={onAddStudents}
          />
        </div>

        {/* Payment Info */}
        <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
          <h3 className="font-medium">Payment Information</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
              Secure bank-to-bank transfer (ACH)
            </li>
            <li className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
              No processing fees
            </li>
            <li className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
              Cancel anytime with no penalties
            </li>
          </ul>
        </div>

        <Separator />

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <StripePaymentForm
            clientSecret={clientSecret}
            payorDetails={{
              email: payorDetails.email || '',
              name:
                payorDetails.firstName && payorDetails.lastName
                  ? `${payorDetails.firstName} ${payorDetails.lastName}`
                  : '',
              phone: payorDetails.phone || '',
            }}
            studentIds={selectedStudents.map((student) => student.id)}
          />
        </Elements>
      </CardContent>
    </Card>
  )
}
