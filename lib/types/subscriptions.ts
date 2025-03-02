import { SubscriptionStatus } from '@prisma/client'

export interface StudentSubscription {
  student: {
    id: string
    name: string
    email: string | null
    monthlyRate: number
    customRate: boolean
    status: string
    batchId: string | null
    batch: {
      id: string
      name: string
    } | null
  }
  payer: {
    id: string
    name: string
    email: string
    stripeCustomerId: string
  } | null
  subscription: {
    id: string
    stripeSubscriptionId: string
    status: SubscriptionStatus
    lastPaymentDate: string | null
    nextPaymentDate: string | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
  } | null
}
