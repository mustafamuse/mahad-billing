import { UseFormReturn } from 'react-hook-form'

import {
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
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'

interface FormFieldProps {
  form: UseFormReturn<EnrollmentFormValues>
  name: keyof EnrollmentFormValues
  label: string
  placeholder?: string
  type?: string
}

export function InputField({
  form,
  name,
  label,
  placeholder,
  type = 'text',
}: FormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              value={field.value as string}
              onChange={(e) => {
                if (name === 'phone') {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '')

                  // Validate length and trigger validation
                  if (value.length > 10) {
                    return // Don't update if more than 10 digits
                  }

                  // Format as (XXX) XXX-XXXX if we have enough digits
                  if (value.length === 10) {
                    const formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`
                    field.onChange(formatted)
                  } else {
                    field.onChange(value)
                  }
                } else {
                  field.onChange(e)
                }
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              className={fieldState.error ? 'border-destructive' : ''}
            />
          </FormControl>
          {fieldState.error && fieldState.isTouched && <FormMessage />}
        </FormItem>
      )}
    />
  )
}

interface RelationshipSelectProps {
  form: UseFormReturn<EnrollmentFormValues>
}

export function RelationshipSelect({ form }: RelationshipSelectProps) {
  const relationships = [
    { value: 'self', label: 'Self (I am the student)' },
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'uncle', label: 'Uncle' },
    { value: 'aunt', label: 'Aunt' },
    { value: 'step-father', label: 'Step Father' },
    { value: 'step-mother', label: 'Step Mother' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <FormField
      control={form.control}
      name="relationship"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>Relationship to Student</FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            defaultValue={field.value}
            onOpenChange={() => {
              if (!fieldState.isTouched) {
                field.onBlur()
              }
            }}
          >
            <FormControl>
              <SelectTrigger
                className={fieldState.error ? 'border-destructive' : ''}
              >
                <SelectValue placeholder="Select your relationship" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {relationships.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error && fieldState.isTouched && <FormMessage />}
        </FormItem>
      )}
    />
  )
}

export function PayorDetailsFields({
  form,
}: {
  form: UseFormReturn<EnrollmentFormValues>
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          form={form}
          name="firstName"
          label="Payor's First Name"
          placeholder="Ali"
        />
        <InputField
          form={form}
          name="lastName"
          label="Payor's Last Name"
          placeholder="Yasin"
        />
      </div>

      <div className="grid gap-4">
        <InputField
          form={form}
          name="email"
          label="Payor's Email"
          type="email"
          placeholder="ali.yasin@example.com"
        />
        <InputField
          form={form}
          name="phone"
          label="Payor's WhatsApp Number"
          placeholder="(612) 555-5555"
        />
      </div>
    </>
  )
}
