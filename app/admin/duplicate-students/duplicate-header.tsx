import { AdminNav } from '@/app/admin/dashboard/components/admin-nav'
import { BaseHeader } from '@/components/base-header'

export function DuplicateHeader() {
  return (
    <div className="space-y-4">
      <BaseHeader
        title="Duplicate Students"
        description="Identify and manage potential duplicate student records"
        layout="split"
        titleClassName="text-3xl font-bold tracking-tight"
        descriptionClassName="text-sm text-muted-foreground"
      />
      <AdminNav />
    </div>
  )
}
