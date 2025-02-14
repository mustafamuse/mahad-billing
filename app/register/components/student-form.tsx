'use client'

import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Form } from '@/components/ui/form'
import { RegisterStudent } from '@/lib/actions/register'

import { ContactSection, PersonalSection, EducationSection } from '../fields'
import { studentFormSchema, StudentFormValues } from '../schema'
import { getFormInitialValues } from '../utils'

interface StudentFormProps {
  student: RegisterStudent
  onUpdate: (values: StudentFormValues) => void
}

export function StudentForm({ student, onUpdate }: StudentFormProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: getFormInitialValues(student),
  })

  // Reset form when student changes
  useEffect(() => {
    form.reset(getFormInitialValues(student))
  }, [student, form])

  // Subscribe to form changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      console.log('Form Changed:', values)
      onUpdate(values as StudentFormValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onUpdate])

  return (
    <div className="rounded-lg border bg-card p-6">
      <Form {...form}>
        <form className="space-y-8">
          <PersonalSection control={form.control} />
          <ContactSection control={form.control} />
          <EducationSection control={form.control} />
        </form>
      </Form>
    </div>
  )
}
