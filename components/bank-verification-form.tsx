'use client'

import { useEffect, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BankMicroDepositValues,
  bankMicroDepositSchema,
} from '@/lib/schemas/bank-verification'

interface BankVerificationFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface PendingVerification {
  id: string
  email: string
  name: string
  students: string[]
  created: string
  last_setup_error?: string
}

interface StripeErrorResponse {
  success: false
  error: string
  code?: string
  type?: string
}

export function BankVerificationForm({
  onSuccess,
  onCancel,
}: BankVerificationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [pendingVerifications, setPendingVerifications] = useState<
    PendingVerification[]
  >([])
  const [error, setError] = useState<string | null>(null)

  const form = useForm<BankMicroDepositValues>({
    resolver: zodResolver(bankMicroDepositSchema),
    defaultValues: {
      setupId: '',
      amount1: '',
      amount2: '',
    },
  })

  // Fetch pending verifications on mount
  useEffect(() => {
    async function fetchPendingVerifications() {
      try {
        const response = await fetch('/api/pending-verifications')
        if (!response.ok) {
          throw new Error('Failed to fetch verifications')
        }
        const data = await response.json()
        setPendingVerifications(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching verifications:', err)
        setError('Failed to load pending verifications')
        toast.error('Failed to load verifications')
      } finally {
        setIsFetching(false)
      }
    }

    fetchPendingVerifications()
  }, [])

  const handleStripeError = (error: StripeErrorResponse) => {
    switch (error.type) {
      case 'StripeInvalidRequestError':
        if (error.code === 'incorrect_amounts') {
          toast.error(
            'The amounts you entered do not match the deposits. Please verify and try again.'
          )
        } else if (error.code === 'verification_expired') {
          toast.error(
            'The verification window has expired. Please request new micro-deposits.'
          )
        } else {
          toast.error(
            'Invalid verification attempt. Please check the amounts and try again.'
          )
        }
        break
      case 'StripeRateLimitError':
        toast.error('Too many attempts. Please try again later.')
        break
      case 'StripeAPIError':
        toast.error(
          'Stripe service is temporarily unavailable. Please try again in a few minutes.'
        )
        break
      default:
        toast.error(error.error || 'Verification failed. Please try again.')
    }
  }

  const onSubmit = async (values: BankMicroDepositValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/verify-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupId: values.setupId,
          amounts: [Number(values.amount1), Number(values.amount2)],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        handleStripeError(data as StripeErrorResponse)
        return
      }

      toast.success(
        'Verification successful! Your bank account has been verified.'
      )
      onSuccess?.()
    } catch (err) {
      console.error('Error submitting verification:', err)
      toast.error('Failed to submit verification. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedVerification = form.watch('setupId')
    ? pendingVerifications.find((v) => v.id === form.watch('setupId'))
    : null

  if (isFetching) {
    return <div className="py-4 text-center">Loading verifications...</div>
  }

  if (error) {
    return (
      <div className="py-4 text-center text-destructive">
        {error}
        <Button variant="outline" size="sm" onClick={onCancel} className="mt-2">
          Close
        </Button>
      </div>
    )
  }

  if (pendingVerifications.length === 0) {
    return (
      <div className="py-4 text-center">
        No pending verifications found.
        <Button variant="outline" size="sm" onClick={onCancel} className="mt-2">
          Close
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="setupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Enrollment</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an enrollment to verify" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pendingVerifications.map((verification) => (
                    <SelectItem key={verification.id} value={verification.id}>
                      {verification.email} - {verification.students.join(', ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedVerification && (
          <div className="text-sm text-muted-foreground">
            <p>Email: {selectedVerification.email}</p>
            <p>Students: {selectedVerification.students.join(', ')}</p>
            <p>
              Created:{' '}
              {new Date(selectedVerification.created).toLocaleDateString()}
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="amount1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Amount</FormLabel>
              <FormControl>
                <Input placeholder="0.00" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Second Amount</FormLabel>
              <FormControl>
                <Input placeholder="0.00" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
