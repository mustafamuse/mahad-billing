'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { motion } from 'framer-motion'
import {
  Loader2,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { StudentSearchCombobox } from '@/app/autopay/(student-selection-step)/student-search-combobox'
import { useEligibleStudents } from '@/app/autopay/hooks/use-eligible-students'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StudentDTO } from '@/lib/actions/get-students'

// Define the custom fields we want to collect during checkout
// Commented out to simplify the payment process
/*
const PAYMENT_CUSTOM_FIELDS = [
  {
    key: 'parent_name',
    label: 'Parent',
    type: 'text' as const,
    optional: false,
  },
  {
    key: 'payment_purpose',
    label: 'Payment Purpose',
    type: 'dropdown' as const,
    optional: false,
    options: [
      { label: 'Regular Monthly Tuition', value: 'regular_tuition' },
      { label: 'Make-up Class', value: 'makeup_class' },
      { label: 'Special Event', value: 'special_event' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    key: 'notes',
    label: 'Additional Notes',
    type: 'text' as const,
    optional: false,
  },
]
*/

export default function PaymentLinkPage() {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<StudentDTO[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [_isConfirmed, setIsConfirmed] = useState(false)
  const { data: students, isLoading, error } = useEligibleStudents()
  const router = useRouter()

  const handleStudentSelect = (student: StudentDTO) => {
    // Check if student is already selected
    if (selectedStudents.some((s) => s.id === student.id)) {
      return
    }

    setSelectedStudents([...selectedStudents, student])
    setIsConfirmed(false) // Reset confirmation when students change
  }

  const isStudentSelected = (studentId: string) => {
    return selectedStudents.some((student) => student.id === studentId)
  }

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(
      selectedStudents.filter((student) => student.id !== studentId)
    )
    setIsConfirmed(false)
  }

  const handleProceedClick = () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to continue')
      return
    }

    // Show confirmation dialog
    setShowConfirmation(true)
  }

  const handleConfirmation = () => {
    setIsConfirmed(true)
    setShowConfirmation(false)
    handleCreatePaymentLink()
  }

  // Calculate total monthly rate for all selected students
  const calculateTotalMonthlyRate = () => {
    return selectedStudents.reduce(
      (total, student) => total + student.monthlyRate,
      0
    )
  }

  const handleCreatePaymentLink = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to continue')
      return
    }

    setIsProcessing(true)

    try {
      // Get payer information if available
      let payerEmail, payerName, payerPhone
      //   let hasExistingSubscription = false

      // Try to get payer info for the primary student
      if (selectedStudents.length > 0) {
        try {
          const primaryStudentId = selectedStudents[0].id
          console.log(
            `🔍 [PAYMENT-LINK] Fetching details for primary student: ${primaryStudentId}`
          )

          const studentResponse = await fetch(
            `/api/students/${primaryStudentId}`
          )
          if (studentResponse.ok) {
            const studentData = await studentResponse.json()
            console.log(
              `✅ [PAYMENT-LINK] Student details fetched:`,
              studentData
            )

            if (studentData.payer) {
              payerEmail = studentData.payer.email
              payerName = studentData.payer.name
              payerPhone = studentData.payer.phone

              // Check if the payer has a Stripe customer ID
              if (studentData.payer.stripeCustomerId) {
                console.log(
                  `💳 [PAYMENT-LINK] Student has payer with Stripe customer ID: ${studentData.payer.stripeCustomerId}`
                )

                // Check if this student already has an active subscription
                try {
                  const subscriptionsResponse = await fetch(
                    `/api/students/${primaryStudentId}/subscriptions`
                  )

                  if (subscriptionsResponse.ok) {
                    const subscriptionsData = await subscriptionsResponse.json()

                    if (
                      subscriptionsData.subscriptions &&
                      subscriptionsData.subscriptions.length > 0
                    ) {
                      const activeSubscriptions =
                        subscriptionsData.subscriptions.filter(
                          (sub: any) => sub.status === 'active'
                        )

                      if (activeSubscriptions.length > 0) {
                        console.log(
                          `⚠️ [PAYMENT-LINK] Student already has ${activeSubscriptions.length} active subscriptions`
                        )
                        // hasExistingSubscription = true

                        // We'll still proceed, but warn the user
                        toast.warning(
                          'This student already has an active subscription. Creating a new one may result in duplicate charges.',
                          { duration: 6000 }
                        )
                      } else {
                        console.log(
                          `✅ [PAYMENT-LINK] Student has no active subscriptions`
                        )
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error checking subscriptions:', error)
                  // Continue without subscription info
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching student details:', error)
          // Continue without payer info
        }
      }

      console.log(
        `🔄 [PAYMENT-LINK] Creating checkout session for ${selectedStudents.length} students`
      )

      // Create a checkout session for the selected students with recurring subscription
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: selectedStudents.map((student) => ({
            id: student.id,
            name: student.name,
            monthlyRate: student.monthlyRate,
            email: student.email,
          })),
          amount: calculateTotalMonthlyRate() * 100, // Convert to cents for Stripe
          payerEmail,
          payerName,
          payerPhone,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const data = await response.json()
      console.log(
        `✅ [PAYMENT-LINK] Checkout session created successfully: ${data.id}`
      )

      // Redirect to the checkout URL
      router.push(data.url)
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create checkout session. Please try again.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border bg-card/30 backdrop-blur-sm">
          <CardHeader className="space-y-2 p-4 sm:p-6">
            <CardTitle className="text-xl font-semibold text-foreground sm:text-2xl">
              Set Up Monthly Tuition Payment
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground sm:text-base">
              Select one or more students to set up automatic monthly payments
              for tuition.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            <div className="relative">
              <StudentSearchCombobox
                students={students || []}
                isLoading={isLoading}
                error={error?.message || null}
                open={open}
                onOpenChange={setOpen}
                onSelect={handleStudentSelect}
                isStudentSelected={isStudentSelected}
              />
            </div>

            {selectedStudents.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium sm:text-base">
                  Selected Students
                </h3>
                {selectedStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="rounded-lg border border-border p-3 sm:p-4"
                  >
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{student.name}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(student.id)}
                            className="ml-2 sm:hidden"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          Monthly Rate: ${student.monthlyRate}
                        </p>
                        {student.email && (
                          <p className="text-xs text-muted-foreground sm:text-sm">
                            Email: {student.email}
                          </p>
                        )}
                        {student.familyDiscount.applied && (
                          <p className="text-xs text-green-500 sm:text-sm">
                            Family Discount: -${student.familyDiscount.amount}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(student.id)}
                        className="hidden self-start sm:inline-flex"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {selectedStudents.length > 0 && (
              <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4 sm:mt-6 sm:p-6">
                <h3 className="mb-3 text-base font-medium sm:mb-4 sm:text-lg">
                  Subscription Summary
                </h3>
                <div className="space-y-2">
                  {selectedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex justify-between text-sm sm:text-base"
                    >
                      <span>{student.name}</span>
                      <span>${student.monthlyRate.toFixed(2)}/month</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-700 pt-2 text-sm font-medium sm:text-base">
                    <span>Total Monthly Charge</span>
                    <span>${calculateTotalMonthlyRate().toFixed(2)}/month</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 rounded-md bg-gray-800/50 p-3 text-xs sm:space-y-3 sm:text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-primary sm:h-4 sm:w-4" />
                    <span>Automatically renews monthly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-primary sm:h-4 sm:w-4" />
                    <span>Secure payment processing via Stripe</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md bg-blue-950/30 p-3 text-xs sm:p-4 sm:text-sm">
              <h4 className="mb-2 font-medium text-blue-400">
                Payment Information
              </h4>
              <p className="text-muted-foreground">
                You'll be redirected to a secure checkout page to complete your
                payment setup.
              </p>
              {/* Removed custom fields list */}
            </div>

            {selectedStudents.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-3 text-xs sm:p-4 sm:text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                  <div>
                    <h4 className="font-medium text-amber-400">
                      Important Checkout Instructions
                    </h4>
                    <p className="mt-1 text-muted-foreground">
                      When you proceed to checkout, please ensure you use:
                    </p>
                    <ul className="mt-2 space-y-1.5 pl-1">
                      {selectedStudents.length === 1 &&
                        selectedStudents[0].email && (
                          <>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                              <span>
                                <strong className="text-amber-300">
                                  Exact name:
                                </strong>{' '}
                                <span className="text-amber-200">
                                  {selectedStudents[0].name}
                                </span>
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                              <span>
                                <strong className="text-amber-300">
                                  Exact email:
                                </strong>{' '}
                                <span className="break-all text-amber-200">
                                  {selectedStudents[0].email}
                                </span>
                              </span>
                            </li>
                          </>
                        )}
                    </ul>
                    <br />
                    <p className="mt-2 text-center text-amber-200/80">
                      <strong>
                        Don't worry about if the bank account belongs to someone
                        else.
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border p-4 sm:p-6">
            <Button
              className="h-10 w-full text-sm sm:h-12 sm:text-base"
              disabled={selectedStudents.length === 0 || isProcessing}
              onClick={handleProceedClick}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                  Processing...
                </>
              ) : (
                'Set Up Monthly Payments'
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              Confirm Your Information
            </DialogTitle>
            <DialogDescription className="text-center">
              Please confirm you will use the following information during
              checkout
            </DialogDescription>
          </DialogHeader>

          {selectedStudents.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <div className="space-y-3">
                  {selectedStudents.length === 1 && (
                    <>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Name (use exactly as shown):
                        </span>
                        <span className="text-base font-medium">
                          {selectedStudents[0].name}
                        </span>
                      </div>

                      {selectedStudents[0].email && (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            Email (use exactly as shown):
                          </span>
                          <span className="break-all text-base font-medium">
                            {selectedStudents[0].email}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {selectedStudents.length > 1 && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Students included in this payment:
                      </span>
                      <ul className="mt-1 space-y-1">
                        {selectedStudents.map((student) => (
                          <li key={student.id} className="text-sm">
                            {student.name} - ${student.monthlyRate.toFixed(2)}
                            /month
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Total monthly payment:
                    </span>
                    <span className="text-base font-medium">
                      ${calculateTotalMonthlyRate().toFixed(2)}/month
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-amber-50 p-3 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Important</p>
                    <p className="center text-sm">
                      <strong>
                        Don't worry about if the bank account belongs to someone
                        else.
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="mb-2 sm:mb-0"
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirmation}
              className="bg-primary/90 hover:bg-primary"
            >
              I Confirm - Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
