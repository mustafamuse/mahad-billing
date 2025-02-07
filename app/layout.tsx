import { Toaster } from 'sonner'

import { EnrollmentProvider } from '@/contexts/enrollment-context'
import { ThemeProvider } from '@/lib/theme-provider'

import './globals.css'

export const metadata = {
  title: 'Roots of Knowledge - Islamic Education',
  description:
    'Comprehensive Islamic education and payment management system at Roots of Knowledge, Eden Prairie.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1"
        />
      </head>

      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <EnrollmentProvider>{children}</EnrollmentProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
