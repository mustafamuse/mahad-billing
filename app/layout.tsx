import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'

import { EnrollmentProvider } from '@/contexts/enrollment-context'
import { ThemeProvider } from '@/providers/theme-provider'

import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Roots of Knowledge - Islamic Education',
  description:
    'Comprehensive Islamic education and payment management system at Roots of Knowledge, Eden Prairie.',
  icons: {
    icon: [
      {
        url: '/official-logo.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: [
      {
        url: '/official-logo.svg',
        type: 'image/svg+xml',
      },
    ],
  },
  openGraph: {
    title: 'Roots of Knowledge - Islamic Education',
    description:
      'Comprehensive Islamic education and payment management system at Roots of Knowledge, Eden Prairie.',
    type: 'website',
    images: [
      {
        url: '/official-logo.svg',
        width: 200,
        height: 52,
        alt: 'Roots of Knowledge Official Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Roots of Knowledge - Islamic Education',
    description:
      'Comprehensive Islamic education and payment management system at Roots of Knowledge, Eden Prairie.',
    images: ['/official-logo.svg'],
  },
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
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={true}
            disableTransitionOnChange={false}
          >
            <EnrollmentProvider>{children}</EnrollmentProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
