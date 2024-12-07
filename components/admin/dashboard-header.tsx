import { Download } from 'lucide-react'

import { PaymentMonitoring } from '@/components/admin/payment-monitoring'
import { BaseHeader } from '@/components/base-header'
import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  const actions = (
    <div className="flex items-center gap-2">
      <PaymentMonitoring />
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export Data
      </Button>
      <Button size="sm">Add Student</Button>
    </div>
  )

  return (
    <BaseHeader
      title="Admin Dashboard"
      description="Manage student subscriptions, payments, and analytics"
      actions={actions}
      layout="split"
      titleClassName="text-3xl font-bold tracking-tight"
      descriptionClassName="text-sm text-muted-foreground"
    />
  )
}
