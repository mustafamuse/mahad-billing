import { Download, PlusCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage student subscriptions, payments, and analytics
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>
    </div>
  )
}
