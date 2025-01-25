'use client'

import { FieldErrors } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EnrollmentFormValues } from '@/lib/schemas/enrollment'
import { cn } from '@/lib/utils'

interface RelationshipSelectProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function RelationshipSelect({
  value,
  onChange,
  error,
}: RelationshipSelectProps) {
  const relationships = [
    { value: 'self', label: 'Self (I am the student)' },
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'uncle', label: 'Uncle' },
    { value: 'aunt', label: 'Aunt' },
    { value: 'step-father', label: 'Step-father' },
    { value: 'step-mother', label: 'Step-mother' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="space-y-2">
      <Label>
        Relationship to Student(s)
        <span className="ml-1 text-destructive">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            'w-full',
            error && 'border-destructive',
            !value && 'text-muted-foreground'
          )}
        >
          <SelectValue placeholder="Select your relationship to the student" />
        </SelectTrigger>
        <SelectContent>
          {relationships.map((relationship) => (
            <SelectItem key={relationship.value} value={relationship.value}>
              {relationship.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface PayorDetailsFieldsProps {
  values: Partial<EnrollmentFormValues>
  onChange: (values: Partial<EnrollmentFormValues>) => void
  showErrors?: boolean
  errors?: FieldErrors<EnrollmentFormValues>
}

export function PayorDetailsFields({
  values,
  onChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showErrors = false,
  errors,
}: PayorDetailsFieldsProps) {
  const handleChange =
    (field: keyof EnrollmentFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      onChange({
        ...values,
        [field]: value,
      })
    }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="Enter first name"
            value={values.firstName || ''}
            onChange={handleChange('firstName')}
            className={cn(errors?.firstName && 'border-destructive')}
            aria-invalid={errors?.firstName ? 'true' : 'false'}
            aria-describedby={errors?.firstName ? 'firstName-error' : undefined}
          />
          {errors?.firstName && (
            <p id="firstName-error" className="text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Enter last name"
            value={values.lastName || ''}
            onChange={handleChange('lastName')}
            className={cn(errors?.lastName && 'border-destructive')}
            aria-invalid={errors?.lastName ? 'true' : 'false'}
            aria-describedby={errors?.lastName ? 'lastName-error' : undefined}
          />
          {errors?.lastName && (
            <p id="lastName-error" className="text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={values.email || ''}
          onChange={handleChange('email')}
          className={cn(errors?.email && 'border-destructive')}
          aria-invalid={errors?.email ? 'true' : 'false'}
          aria-describedby={errors?.email ? 'email-error' : undefined}
        />
        {errors?.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter phone number (10 digits)"
          value={values.phone || ''}
          onChange={handleChange('phone')}
          className={cn(errors?.phone && 'border-destructive')}
          aria-invalid={errors?.phone ? 'true' : 'false'}
          aria-describedby={errors?.phone ? 'phone-error' : undefined}
          pattern="[0-9]{10}"
        />
        {errors?.phone && (
          <p id="phone-error" className="text-sm text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>
    </div>
  )
}
