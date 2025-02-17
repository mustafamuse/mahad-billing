'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { EnrollmentStepsProgress } from '@/app/autopay/(enrollment)/enrollment-steps-progress'
import {
  PayorDetailsFields,
  RelationshipSelect,
} from '@/app/autopay/(payor-details-step)/payor-details-fields'
import { TermsModal } from '@/app/autopay/(payor-details-step)/terms-modal'
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
import { Spinner } from '@/components/ui/spinner'
import { useEnrollment } from '@/contexts/enrollment-context'
import {
  enrollmentSchema,
  type EnrollmentFormValues,
  isApiError,
} from '@/lib/schemas/enrollment'
import { type Relationship } from '@/lib/types'

export function PayorDetailsStep() {
  const {
    state: { selectedStudents, isTermsModalOpen, payorDetails, isProcessing },
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

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      console.log('Submit handler:', {
        rawValues: values,
        termsAccepted: values.termsAccepted,
        formState: {
          isValid: form.formState.isValid,
          errors: form.formState.errors,
          dirtyFields: form.formState.dirtyFields,
        },
      })

      if (!values.termsAccepted) {
        console.log('Terms not accepted, showing toast')
        toast.error('Please accept the terms and conditions')
        return
      }

      const payload = {
        payerDetails: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          relationship: values.relationship,
        },
        studentIds: selectedStudents.map((s) => s.id),
        termsAccepted: values.termsAccepted,
      }

      console.log('Sending payload:', payload)

      await prepareSetup(payload)
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
      <EnrollmentStepsProgress currentStep={1} />
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
                form.setValue('relationship', value as Relationship, {
                  shouldValidate: true,
                })
                updatePayorDetails({
                  ...payorDetails,
                  relationship: value as Relationship,
                })
              }}
              error={
                form.formState.errors.relationship
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
                updatePayorDetails({
                  ...values,
                  relationship: values.relationship as Relationship,
                })
              }}
              showErrors={!!form.formState.errors.termsAccepted}
              errors={form.formState.errors}
            />

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  {...form.register('termsAccepted')}
                  checked={form.watch('termsAccepted')}
                  onCheckedChange={(checked) => {
                    console.log('Checkbox changed:', {
                      checked,
                      beforeValue: form.getValues('termsAccepted'),
                    })

                    form.setValue('termsAccepted', checked === true, {
                      shouldValidate: true,
                    })

                    console.log('After setValue:', {
                      formValue: form.getValues('termsAccepted'),
                      watchValue: form.watch('termsAccepted'),
                    })
                  }}
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm font-medium underline"
                    onClick={() => toggleTermsModal()}
                  >
                    Terms and Conditions
                  </Button>
                </label>
              </div>
              {form.formState.errors.termsAccepted && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.termsAccepted.message}
                </p>
              )}
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
