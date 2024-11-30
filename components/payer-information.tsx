'use client'

import { UseFormReturn } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface PayerInformationProps {
  form: UseFormReturn<FormValues>
}

export function PayerInformation({ form }: PayerInformationProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payer Information</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...form.register('firstName')}
            placeholder="Enter first name"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.firstName.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...form.register('lastName')}
            placeholder="Enter last name"
          />
          {form.formState.errors.lastName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.lastName.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            placeholder="Enter email address"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            {...form.register('phone')}
            placeholder="Enter phone number"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive">
              {form.formState.errors.phone.message as string}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
