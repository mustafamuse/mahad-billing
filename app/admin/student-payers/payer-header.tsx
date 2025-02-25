import { AdminNav } from '@/app/admin/dashboard/components/admin-nav'
import { BaseHeader } from '@/components/base-header'

export function PayerHeader() {
  return (
    <div className="space-y-4">
      <BaseHeader
        title="Student Payers"
        description="Monitor students with payers and their Stripe payment status"
        layout="split"
        titleClassName="text-3xl font-bold tracking-tight"
        descriptionClassName="text-sm text-muted-foreground"
      />
      <AdminNav />
    </div>
  )
}
