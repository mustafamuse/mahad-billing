'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowLeft, Calendar, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StudentDTO } from '@/lib/actions/get-students'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const [_isLoading, setIsLoading] = useState(true)
  const [student, setStudent] = useState<StudentDTO | null>(null)
  const [_syncStatus, setSyncStatus] = useState<
    'pending' | 'success' | 'failed' | 'retrying'
  >('pending')
  const [syncAttempts, setSyncAttempts] = useState(0)

  useEffect(() => {
    const studentId = searchParams.get('studentId')
    console.log(
      `🔍 [PAYMENT-SUCCESS-PAGE] Initializing with studentId: ${studentId}`
    )

    if (!studentId) {
      console.error('❌ [PAYMENT-SUCCESS-PAGE] No student ID provided in URL')
      toast.error('Missing student information')
      setIsLoading(false)
      return
    }

    // Fetch student information
    const fetchStudentInfo = async () => {
      try {
        console.log(
          `🔍 [PAYMENT-SUCCESS-PAGE] Fetching student info for ID: ${studentId}`
        )
        const response = await fetch(`/api/students/${studentId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch student information')
        }

        const studentData = await response.json()
        console.log(
          `✅ [PAYMENT-SUCCESS-PAGE] Student info fetched successfully:`,
          studentData
        )
        setStudent(studentData)

        // Wait a moment to allow webhooks to process before syncing
        console.log(
          `⏱️ [PAYMENT-SUCCESS-PAGE] Waiting 2 seconds before syncing data...`
        )
        setTimeout(() => syncStripeData(studentId), 2000)
      } catch (error) {
        console.error(
          '❌ [PAYMENT-SUCCESS-PAGE] Error fetching student:',
          error
        )
        toast.error('Failed to load student information')
        setIsLoading(false)
      }
    }

    // Sync Stripe data with our database
    const syncStripeData = async (studentId: string) => {
      try {
        setSyncStatus('pending')
        setSyncAttempts((prev) => prev + 1)
        console.log(
          `🔄 [PAYMENT-SUCCESS-PAGE] Syncing Stripe data for student: ${studentId} (Attempt ${syncAttempts + 1})`
        )

        const response = await fetch('/api/payment-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ studentId }),
        })

        const data = await response.json()

        if (response.ok && data.syncedData) {
          console.log(
            `✅ [PAYMENT-SUCCESS-PAGE] Stripe data synced successfully:`,
            data
          )
          setSyncStatus('success')
          setIsLoading(false)
        } else if (response.ok && !data.syncedData) {
          console.log(
            `⚠️ [PAYMENT-SUCCESS-PAGE] No Stripe data found to sync:`,
            data
          )

          // If this is the first attempt, retry after a longer delay
          if (syncAttempts < 2) {
            console.log(
              `🔄 [PAYMENT-SUCCESS-PAGE] Will retry sync in 5 seconds...`
            )
            setSyncStatus('retrying')
            setTimeout(() => syncStripeData(studentId), 5000)
          } else {
            console.log(
              `❌ [PAYMENT-SUCCESS-PAGE] Giving up after ${syncAttempts} attempts`
            )
            setSyncStatus('failed')
            setIsLoading(false)
            toast.error('Unable to sync payment data. Please contact support.')
          }
        } else {
          console.error(`❌ [PAYMENT-SUCCESS-PAGE] Error syncing data:`, data)
          setSyncStatus('failed')
          setIsLoading(false)
          toast.error('Failed to sync payment data')
        }
      } catch (error) {
        console.error(
          '❌ [PAYMENT-SUCCESS-PAGE] Error syncing Stripe data:',
          error
        )
        setSyncStatus('failed')
        setIsLoading(false)
        toast.error('Failed to sync payment data')
      }
    }

    fetchStudentInfo()
  }, [searchParams])

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border bg-card/30 backdrop-blur-sm">
          <CardHeader className="space-y-2 p-4 text-center sm:p-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 sm:mb-4 sm:h-20 sm:w-20">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 sm:h-10 sm:w-10" />
            </div>
            <CardTitle className="text-xl font-semibold text-foreground sm:text-2xl">
              Subscription Activated!
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground sm:text-base">
              {student ? (
                <>
                  Your monthly tuition subscription for {student.name} has been
                  successfully set up.
                </>
              ) : (
                <>
                  Your monthly tuition subscription has been successfully set
                  up.
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            <div className="rounded-lg border border-border bg-card/50 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground sm:mb-4 sm:gap-3 sm:text-sm">
                <Calendar className="h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
                <span>Your subscription will automatically renew monthly</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:gap-3 sm:text-sm">
                <CreditCard className="h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
                <span>
                  Your payment method has been securely saved for future
                  payments
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-green-500/30 bg-green-950/20 p-4 text-center text-sm text-green-300 sm:p-6">
              <p>
                You will receive a confirmation email with your subscription
                details shortly.
              </p>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border p-4 sm:p-6">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:text-base"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
