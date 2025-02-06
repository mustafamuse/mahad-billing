'use client'

interface GeometricPatternProps {
  className?: string
  color?: string
}

export function GeometricPattern({
  className = '',
  color = 'currentColor',
}: GeometricPatternProps) {
  return (
    <div className={`pointer-events-none absolute opacity-[0.15] ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 800"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill={color}>
          <path d="M400 200L600 400L400 600L200 400z" />
          <path d="M400 250L550 400L400 550L250 400z" />
          <path d="M400 300L500 400L400 500L300 400z" />
        </g>
        <g fill="none" stroke={color} strokeWidth="2">
          <circle cx="400" cy="400" r="200" />
          <circle cx="400" cy="400" r="150" />
          <circle cx="400" cy="400" r="100" />
          <path d="M200 400h400M400 200v400" />
          <path d="M282.843 282.843l234.314 234.314M282.843 517.157l234.314-234.314" />
        </g>
      </svg>
    </div>
  )
}
