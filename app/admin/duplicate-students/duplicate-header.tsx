import { AdminNav } from '@/app/admin/dashboard/components/admin-nav'

export function DuplicateHeader() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Duplicate Students
          </h1>
          <p className="text-sm text-muted-foreground">
            Identify and manage potential duplicate student records
          </p>
        </div>
      </div>
      <AdminNav />
    </div>
  )
}
