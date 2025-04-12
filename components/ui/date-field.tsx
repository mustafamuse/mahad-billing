'use client'

import { ReactNode, useRef } from 'react'
import {
  AriaDateFieldProps,
  useDateField,
  useDateSegment,
} from '@react-aria/datepicker'
import {
  DateFieldState,
  DateSegment as IDateSegment,
  useDateFieldState,
} from '@react-stately/datepicker'
import { CalendarDate, createCalendar } from '@internationalized/date'
import { cn } from '@/lib/utils'

interface DateSegmentProps {
  segment: IDateSegment
  state: DateFieldState
}

function DateSegment({ segment, state }: DateSegmentProps) {
  const ref = useRef(null)
  const {
    segmentProps: { ...segmentProps },
  } = useDateSegment(segment, state, ref)

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={cn(
        'focus:rounded-[2px] focus:bg-primary focus:text-primary-foreground focus:outline-none',
        segment.type !== 'literal' ? 'px-[1px]' : '',
        segment.isPlaceholder ? 'text-muted-foreground' : ''
      )}
    >
      {segment.text}
    </div>
  )
}

interface DateFieldProps
  extends Omit<AriaDateFieldProps<CalendarDate>, 'value' | 'onChange'> {
  value?: CalendarDate | null
  onChange?: (date: CalendarDate | null) => void
  children?: ReactNode
  'aria-invalid'?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

function DateField({ value, onChange, children, ...props }: DateFieldProps) {
  const ref = useRef(null)
  const state = useDateFieldState({
    ...props,
    value,
    onChange,
    locale: 'en-US',
    createCalendar: (locale) => createCalendar(locale),
  })
  const { fieldProps } = useDateField(props, state, ref)

  return (
    <div
      {...fieldProps}
      ref={ref}
      className={cn(
        'inline-flex h-10 w-full flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        props['aria-invalid'] && 'border-destructive'
      )}
    >
      {state.segments.map((segment, i) => (
        <DateSegment key={i} segment={segment} state={state} />
      ))}
      {children}
    </div>
  )
}

interface DateInputProps {
  className?: string
}

function DateInput({ className }: DateInputProps) {
  return null
}

export { DateField, DateInput }
