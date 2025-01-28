'use client'

import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  PayorDetailsFields,
  RelationshipSelect,
} from '@/app/(payor-details-step)/payor-details-fields'
import { TermsModal } from '@/app/(payor-details-step)/terms-modal'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEnrollment } from '@/contexts/enrollment-context'
import {
  enrollmentSchema,
  type EnrollmentFormValues,
  isApiError,
} from '@/lib/schemas/enrollment'

import { EnrollmentStepsProgress } from '../(enrollment)/enrollment-steps-progress'

export function PayorDetailsStep() {
  const {
    state: {
      selectedStudents,
      hasViewedTerms,
      isTermsModalOpen,
      payorDetails,
      isProcessing,
    },
    actions: {
      previousStep,
      nextStep,
      updatePayorDetails,
      handleTermsAgreement,
      toggleTermsModal,
      prepareSetup,
    },
  } = useEnrollment()

  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      termsAccepted: false,
      students: selectedStudents.map((s) => s.id),
      ...payorDetails,
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showErrors, setShowErrors] = useState(true)

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await prepareSetup({
        ...values,
        studentIds: selectedStudents.map((s) => s.id),
      })
      nextStep()
    } catch (error) {
      console.error('Failed to prepare setup:', error)
      if (isApiError(error)) {
        toast.error(error.message)
      } else {
        toast.error('Failed to prepare setup. Please try again.')
      }
    }
  })

  console.log('Form State:', {
    values: form.getValues(),
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    touchedFields: form.formState.touchedFields,
  })

  return (
    <div>
      <EnrollmentStepsProgress currentStep={2} />
      <Card className="border-0 sm:border">
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl">Payor Details</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter the information of the person responsible for making the
            payments.
            {selectedStudents.length === 1
              ? " If you're paying for yourself, enter your own details."
              : ' This should be the parent/guardian if paying for children.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <RelationshipSelect
              value={form.watch('relationship')}
              onChange={(value) => {
                form.setValue('relationship', value, { shouldValidate: true })
                updatePayorDetails({
                  ...payorDetails,
                  relationship: value,
                })
              }}
              error={
                showErrors && form.formState.errors.relationship
                  ? form.formState.errors.relationship.message
                  : undefined
              }
            />

            <PayorDetailsFields
              values={form.watch()}
              onChange={(values) => {
                Object.entries(values).forEach(([key, value]) => {
                  form.setValue(key as keyof EnrollmentFormValues, value, {
                    shouldValidate: true,
                  })
                })
                updatePayorDetails(values)
              }}
              showErrors={showErrors}
              errors={form.formState.errors}
            />

            <div className="flex items-start space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Checkbox
                        checked={form.watch('termsAccepted')}
                        onCheckedChange={(checked) => {
                          if (!hasViewedTerms) {
                            toggleTermsModal()
                            return
                          }
                          form.setValue('termsAccepted', checked as boolean, {
                            shouldValidate: true,
                          })
                        }}
                        disabled={!hasViewedTerms}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    <p>Please read the terms and conditions first</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="space-y-1 leading-none">
                <Label className="text-base font-normal">
                  I agree to the{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-primary underline decoration-primary underline-offset-4 hover:text-primary/80"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleTermsModal()
                    }}
                  >
                    Terms and Conditions
                  </Button>
                  {!hasViewedTerms && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (click to review)
                    </span>
                  )}
                </Label>
                {showErrors && form.formState.errors.termsAccepted && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.termsAccepted.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-4 p-4 sm:p-6">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 text-base font-medium"
              onClick={previousStep}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="h-12 flex-1 text-base font-medium"
              disabled={isProcessing || !form.formState.isValid}
            >
              {isProcessing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </CardFooter>
        </form>

        <TermsModal
          open={isTermsModalOpen}
          onOpenChange={toggleTermsModal}
          onAgree={(form) => {
            handleTermsAgreement(form)
            form.setValue('termsAccepted', true, { shouldValidate: true })
          }}
          form={form}
        />
      </Card>
    </div>
  )
}
