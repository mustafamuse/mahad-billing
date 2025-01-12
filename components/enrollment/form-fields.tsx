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
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
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
      render={({ field }) => (
        <FormItem>
          <FormLabel>Relationship to Student</FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
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
          <FormMessage />
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
          placeholder="+1 (555) 555-5555"
        />
      </div>
    </>
  )
}
