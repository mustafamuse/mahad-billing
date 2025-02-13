'use client'

import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment,
  DateValue,
  TimeField as TimeFieldRac,
  TimeValue,
  composeRenderProps,
} from 'react-aria-components'

import { cn } from '@/lib/utils'

interface DateFieldProps {
  value?: DateValue | null
  onChange?: (date: DateValue | null) => void
  className?: string
  children?: React.ReactNode
}

function DateField({ className, ...props }: DateFieldProps) {
  return (
    <AriaDateField
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

function TimeField<T extends TimeValue>({
  className,
  children,
  ...props
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <TimeFieldRac
      className={composeRenderProps(className, (className) =>
        cn('space-y-2', className)
      )}
      {...props}
    >
      {children}
    </TimeFieldRac>
  )
}

function DateInput({ className }: { className?: string }) {
  return (
    <AriaDateInput
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {(segment) => (
        <DateSegment
          segment={segment}
          className={cn(
            'focus:rounded-[2px] focus:bg-primary focus:text-primary-foreground focus:outline-none',
            {
              'text-muted-foreground': segment.type === 'literal',
            }
          )}
        />
      )}
    </AriaDateInput>
  )
}

export { DateField, DateInput, TimeField }
