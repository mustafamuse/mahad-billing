import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'lg' | 'xl'
  showText?: boolean
}

const sizes = {
  xs: { width: 80, height: 24 },
  sm: { width: 100, height: 28 },
  lg: { width: 200, height: 56 },
  xl: { width: 600, height: 168 },
}

export function Logo({ className, size = 'sm', showText = true }: LogoProps) {
  const dimensions = sizes[size]

  return (
    <div className={cn('relative flex items-center gap-3', className)}>
      <div className="relative flex items-center">
        <Image
          src="/official-logo.svg"
          alt="Roots of Knowledge Official Logo"
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain"
          priority={size === 'sm'} // Prioritize loading for main logo
          style={{
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
      {showText && (
        <span
          className={cn(
            'font-medium text-foreground',
            size === 'xs' && 'text-xs',
            size === 'sm' && 'text-sm',
            size === 'lg' && 'text-base',
            size === 'xl' && 'text-lg'
          )}
        >
          Roots of Knowledge
        </span>
      )}
    </div>
  )
}
