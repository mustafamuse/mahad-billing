'use client'

import React from 'react'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Banknote,
  Loader2,
  LockIcon,
  ShieldCheck,
  Clock,
  LockKeyhole,
  CreditCard,
} from 'lucide-react'

import { EnrollmentSummary } from '@/components/enrollment/enrollment-summary'
import { StripePaymentForm } from '@/components/stripe-payment-form'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEnrollment } from '@/contexts/enrollment-context'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

const faqItems = [
  {
    id: '1',
    icon: Clock,
    title: 'When will this payment be processed?',
    content: 'This payment will be processed in a few days.',
  },
  {
    id: '2',
    icon: LockKeyhole,
    title: 'Is my information secure?',
    content:
      'Yes, all payment information is securely processed by Stripe, a leading payment processor. We never store your bank details.',
  },
  {
    id: '3',
    icon: CreditCard,
    title: 'What if I need to update my payment method?',
    content:
      'You can update your payment method at any time by contacting Mahad Admin.',
  },
]

export function PaymentStep() {
  const {
    state: { step, selectedStudents, payorDetails, clientSecret },
    actions: { setStep },
  } = useEnrollment()

  const handleAddStudents = () => {
    setStep(1) // Go back to student selection step
  }

  // Skip rendering the form if we've moved past step 3
  if (step > 3) {
    return null
  }

  if (!clientSecret || !payorDetails) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">Student Info</div>
            <div className="h-0.5 w-12 bg-gray-200" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">Contact Info</div>
            <div className="h-0.5 w-12 bg-gray-200" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-primary">
              Payment Setup
            </div>
          </div>
        </div>

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
                onAddStudents={handleAddStudents}
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
                  email: payorDetails.email,
                  name: `${payorDetails.firstName} ${payorDetails.lastName}`,
                  phone: payorDetails.phone,
                }}
                studentIds={selectedStudents.map((student) => student.id)}
              />
            </Elements>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-16 border-t">
          <div className="mx-auto max-w-[500px] px-4 py-8 md:max-w-none md:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item) => (
                  <AccordionItem
                    value={item.id}
                    key={item.id}
                    className="border-b py-2 last:border-b-0"
                  >
                    <AccordionTrigger className="py-2 text-[15px] leading-6 hover:no-underline [&>span]:text-left">
                      <span className="flex items-center gap-3">
                        <item.icon
                          size={16}
                          strokeWidth={2}
                          className="shrink-0 opacity-60"
                          aria-hidden="true"
                        />
                        <span>{item.title}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2 ps-7 text-left text-sm text-muted-foreground">
                      {item.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
