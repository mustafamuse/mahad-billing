import { Inter } from 'next/font/google'

import type { Metadata } from 'next'

import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tutoring Program Enrollment',
  description: 'Enroll in our comprehensive tutoring program',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
