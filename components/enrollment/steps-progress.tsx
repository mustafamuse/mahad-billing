import { cn } from '@/lib/utils'

interface StepsProgressProps {
  currentStep: number
  steps: {
    id: number
    label: string
    description?: string
  }[]
}

export function StepsProgress({ currentStep, steps }: StepsProgressProps) {
  return (
    <div className="mb-8 space-y-4">
      <p className="text-sm text-muted-foreground">
        Step {currentStep} of {steps.length}
      </p>
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step) => (
            <li key={step.id} className="md:flex-1">
              <div
                className={cn(
                  'group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4',
                  step.id < currentStep
                    ? 'border-primary hover:border-primary/70'
                    : step.id === currentStep
                      ? 'border-primary'
                      : 'border-muted-foreground/20'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-medium',
                    step.id < currentStep
                      ? 'text-primary'
                      : step.id === currentStep
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span
                    className={cn(
                      'text-sm',
                      step.id < currentStep
                        ? 'text-muted-foreground'
                        : step.id === currentStep
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                    )}
                  >
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
