import { ReactNode } from 'react'

import { LucideIcon } from 'lucide-react'

interface BaseHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  iconClassName?: string
  actions?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  layout?: 'centered' | 'split'
}

export function BaseHeader({
  title,
  description,
  icon: Icon,
  iconClassName = 'h-12 w-12 text-blue-600 dark:text-blue-400',
  actions,
  className = '',
  titleClassName = 'text-4xl font-bold text-gray-900 dark:text-white',
  descriptionClassName = 'text-lg text-gray-600 dark:text-gray-300',
  layout = 'centered',
}: BaseHeaderProps) {
  const containerClasses =
    layout === 'centered'
      ? 'mb-12 text-center'
      : 'flex flex-col gap-4 md:flex-row md:items-center md:justify-between'

  const contentClasses = layout === 'centered' ? 'mx-auto max-w-2xl' : ''

  return (
    <header className={`${containerClasses} ${className}`}>
      <div className={contentClasses}>
        {Icon && layout === 'centered' && (
          <div className="mb-4 flex items-center justify-center">
            <Icon className={iconClassName} />
          </div>
        )}

        <div>
          <h1
            className={`${titleClassName} ${layout === 'centered' ? 'mb-4' : ''}`}
          >
            {title}
          </h1>
          {description && <p className={descriptionClassName}>{description}</p>}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
