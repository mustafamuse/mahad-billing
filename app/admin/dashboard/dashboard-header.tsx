import { Download } from 'lucide-react'

import { AdminNav } from '@/app/admin/dashboard/components/admin-nav'
import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Export Data
      </Button>
      <Button size="sm">Add Student</Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage student subscriptions, payments, and analytics
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {actions}
        </div>
      </div>
      <AdminNav />
    </div>
  )
}
