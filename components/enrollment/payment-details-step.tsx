'use client'

import { UseFormReturn } from 'react-hook-form'

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
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PaymentDetailsStepProps {
  form: UseFormReturn<FormValues>
  isProcessing: boolean
  hasViewedTerms: boolean
  onBack: () => void
  onOpenTerms: () => void
}

interface FormValues {
  students: string[]
  firstName: string
  lastName: string
  email: string
  phone: string
  termsAccepted: boolean
}

export function PaymentDetailsStep({
  form,
  isProcessing,
  hasViewedTerms,
  onBack,
  onOpenTerms,
}: PaymentDetailsStepProps) {
  return (
    <Card className="border-0 sm:border">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">
          Payment Information
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Enter your payment details to complete enrollment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Your First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter first name"
                    className="h-12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Your Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter last name"
                    className="h-12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Your Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  className="h-12"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">
                Your WhatsApp Phone Number
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  className="h-12"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            if (!hasViewedTerms) {
                              onOpenTerms()
                              return
                            }
                            field.onChange(checked)
                          }}
                          disabled={!hasViewedTerms}
                        />
                      </div>
                    </TooltipTrigger>
                    {!hasViewedTerms && (
                      <TooltipContent>
                        <p>Please read the terms and conditions first</p>
                      </TooltipContent>
                    )}
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
                      onOpenTerms()
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
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="flex flex-col gap-3 p-4 sm:flex-row sm:p-6">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full text-base font-medium"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="h-12 w-full bg-white text-base font-medium text-black hover:bg-gray-100"
          disabled={isProcessing || !form.getValues('termsAccepted')}
        >
          {isProcessing ? 'Processing...' : 'Confirm and Proceed to Payment'}
        </Button>
      </CardFooter>
    </Card>
  )
}
