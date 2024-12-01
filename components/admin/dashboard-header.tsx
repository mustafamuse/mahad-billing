import { Download, PlusCircle } from 'lucide-react'

import { BaseHeader } from '@/components/base-header'
import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  const actions = (
    <>
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export Data
      </Button>
      <Button size="sm">
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Student
      </Button>
    </>
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
