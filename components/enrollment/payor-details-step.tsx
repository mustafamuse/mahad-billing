'use client'

import { useEffect } from 'react'

import { UseFormReturn } from 'react-hook-form'

import {
  PayorDetailsFields,
  RelationshipSelect,
} from '@/components/enrollment/form-fields'
import { TermsModal } from '@/components/terms-modal'
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
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEnrollment } from '@/contexts/enrollment-context'
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'

import { StepsProgress } from './steps-progress'

interface PayorDetailsStepProps {
  form: UseFormReturn<EnrollmentFormValues>
}

export function PayorDetailsStep({ form }: PayorDetailsStepProps) {
  const {
    state: { selectedStudents, hasViewedTerms, isTermsModalOpen },
    actions: { previousStep, handleTermsAgreement, toggleTermsModal },
  } = useEnrollment()

  // Reset form validation state when component mounts
  useEffect(() => {
    form.clearErrors()
  }, [form])

  return (
    <div>
      <StepsProgress currentStep={2} />
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
        <CardContent className="space-y-4 p-4 sm:p-6">
          <RelationshipSelect form={form} />
          <PayorDetailsFields form={form} />

          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-col space-y-3">
                <div className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                if (!hasViewedTerms) {
                                  toggleTermsModal()
                                  return
                                }
                                field.onChange(checked)
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
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-normal">
                      I agree to the{' '}
                      <Button
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
                    </FormLabel>
                    {field.value === false && <FormMessage />}
                  </div>
                </div>
              </FormItem>
            )}
          />
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
            disabled={
              form.formState.isSubmitting || !form.getValues('termsAccepted')
            }
          >
            {form.formState.isSubmitting
              ? 'Processing...'
              : 'Continue to Payment'}
          </Button>
        </CardFooter>

        <TermsModal
          open={isTermsModalOpen}
          onOpenChange={toggleTermsModal}
          onAgree={() => handleTermsAgreement(form)}
        />
      </Card>
    </div>
  )
}
