import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const dimensions = sizes[size]

  return (
    <div className={cn('relative flex items-center gap-3', className)}>
      <div
        className="relative overflow-hidden rounded-full"
        style={{ width: dimensions, height: dimensions }}
      >
        <Image
          src="/logo.png"
          alt="Roots of Knowledge"
          width={dimensions}
          height={dimensions}
          className="object-contain"
        />
      </div>
      <span className="text-lg font-medium">Roots of Knowledge</span>
    </div>
  )
}
