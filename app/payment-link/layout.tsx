import { ReactNode } from 'react'

export const metadata = {
  title: 'Set Up Monthly Tuition Payments',
  description: 'Select your name and set up automatic monthly tuition payments',
}

export default function PaymentLinkLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
      {children}
    </main>
  )
}
