import { AdminNav } from '@/app/admin/dashboard/components/admin-nav'
import { BaseHeader } from '@/components/base-header'

export function SiblingHeader() {
  return (
    <div className="space-y-4">
      <BaseHeader
        title="Sibling Groups"
        description="Manage student sibling relationships and family groups"
        layout="split"
        titleClassName="text-3xl font-bold tracking-tight"
        descriptionClassName="text-sm text-muted-foreground"
      />
      <AdminNav />
    </div>
  )
}
