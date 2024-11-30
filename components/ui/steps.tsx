import { cn } from '@/lib/utils'

interface StepsProps {
  children: React.ReactNode
  className?: string
}

interface StepProps {
  children: React.ReactNode
  isActive?: boolean
  className?: string
}

export function Steps({ children, className }: StepsProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {children}
    </div>
  )
}

export function Step({ children, isActive, className }: StepProps) {
  return (
    <div
      className={cn(
        'flex items-center space-x-2 text-muted-foreground',
        isActive && 'font-medium text-primary',
        className
      )}
    >
      <div
        className={cn(
          'h-2 w-2 rounded-full bg-muted',
          isActive && 'bg-primary'
        )}
      />
      <span>{children}</span>
    </div>
  )
}
