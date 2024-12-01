'use client'

import { useTheme } from 'next-themes'
import { toast, Toaster as SonnerToaster } from 'sonner'

import { cn } from '@/lib/utils'

export { toast }

interface ToasterProps {
  closeButton?: boolean
  className?: string
  theme?: 'light' | 'dark' | 'system'
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center'
}

export function Toaster({
  closeButton = true,
  className,
  theme: customTheme,
  position = 'top-center',
  ...props
}: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <SonnerToaster
      theme={customTheme || (theme as ToasterProps['theme'])}
      className={className}
      richColors
      expand={true}
      duration={5000}
      position={position}
      closeButton={closeButton}
      toastOptions={{
        classNames: {
          toast: cn(
            'group toast',
            'data-[type=success]:bg-green-50 data-[type=success]:text-green-800 dark:data-[type=success]:bg-green-900 dark:data-[type=success]:text-green-100',
            'data-[type=error]:bg-red-50 data-[type=error]:text-red-800 dark:data-[type=error]:bg-red-900 dark:data-[type=error]:text-red-100',
            'data-[type=info]:bg-blue-50 data-[type=info]:text-blue-800 dark:data-[type=info]:bg-blue-900 dark:data-[type=info]:text-blue-100',
            'data-[type=warning]:bg-yellow-50 data-[type=warning]:text-yellow-800 dark:data-[type=warning]:bg-yellow-900 dark:data-[type=warning]:text-yellow-100',
            'border rounded-lg shadow-lg',
            'dark:border-gray-700'
          ),
          description: cn(
            'text-sm mt-1',
            'group-data-[type=success]:text-green-700 dark:group-data-[type=success]:text-green-200',
            'group-data-[type=error]:text-red-700 dark:group-data-[type=error]:text-red-200',
            'group-data-[type=info]:text-blue-700 dark:group-data-[type=info]:text-blue-200',
            'group-data-[type=warning]:text-yellow-700 dark:group-data-[type=warning]:text-yellow-200'
          ),
          actionButton: cn(
            'group-data-[type=success]:bg-green-100 group-data-[type=success]:text-green-800',
            'group-data-[type=error]:bg-red-100 group-data-[type=error]:text-red-800',
            'group-data-[type=info]:bg-blue-100 group-data-[type=info]:text-blue-800',
            'group-data-[type=warning]:bg-yellow-100 group-data-[type=warning]:text-yellow-800',
            'dark:group-data-[type=success]:bg-green-800 dark:group-data-[type=success]:text-green-100',
            'dark:group-data-[type=error]:bg-red-800 dark:group-data-[type=error]:text-red-100',
            'dark:group-data-[type=info]:bg-blue-800 dark:group-data-[type=info]:text-blue-100',
            'dark:group-data-[type=warning]:bg-yellow-800 dark:group-data-[type=warning]:text-yellow-100',
            'rounded px-3 py-2 text-sm font-medium transition-colors',
            'hover:opacity-90'
          ),
          cancelButton: cn(
            'group-data-[type=success]:bg-green-50 group-data-[type=success]:text-green-700',
            'group-data-[type=error]:bg-red-50 group-data-[type=error]:text-red-700',
            'group-data-[type=info]:bg-blue-50 group-data-[type=info]:text-blue-700',
            'group-data-[type=warning]:bg-yellow-50 group-data-[type=warning]:text-yellow-700',
            'dark:group-data-[type=success]:bg-green-900 dark:group-data-[type=success]:text-green-100',
            'dark:group-data-[type=error]:bg-red-900 dark:group-data-[type=error]:text-red-100',
            'dark:group-data-[type=info]:bg-blue-900 dark:group-data-[type=info]:text-blue-100',
            'dark:group-data-[type=warning]:bg-yellow-900 dark:group-data-[type=warning]:text-yellow-100',
            'rounded px-3 py-2 text-sm font-medium transition-colors',
            'hover:opacity-90'
          ),
        },
      }}
      {...props}
    />
  )
}
