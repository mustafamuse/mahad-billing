import { Inter } from 'next/font/google'

import { Toaster } from 'sonner'

import { ThemeProvider } from '@/components/theme-provider'
import { EnrollmentProvider } from '@/contexts/enrollment-context'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Mahad Autopay',
  description: 'Enrollment and payment management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <EnrollmentProvider>{children}</EnrollmentProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
