import { ReactNode } from 'react'

export const metadata = {
  title: 'Subscription Activated',
  description: 'Your monthly tuition subscription has been successfully set up',
}

export default function PaymentSuccessLayout({
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
