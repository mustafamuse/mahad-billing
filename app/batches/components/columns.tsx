'use client'

import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { BatchStudentData } from '@/lib/actions/get-batch-data'

export const columns: ColumnDef<BatchStudentData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'batch',
    header: 'Batch',
    cell: ({ row }) => {
      const batch = row.original.batch
      return batch ? (
        <div className="space-y-1">
          <Badge variant="secondary" className="font-medium">
            {batch.name}
          </Badge>
          {batch.startDate && (
            <div className="text-xs text-muted-foreground">
              {format(new Date(batch.startDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      )
    },
  },
  {
    accessorKey: 'siblingGroup',
    header: 'Siblings',
    cell: ({ row }) => {
      const siblings = row.original.siblingGroup?.students.filter(
        (s) => s.id !== row.original.id
      )

      return siblings?.length ? (
        <div className="flex flex-wrap gap-1">
          {siblings.map((sibling) => (
            <Badge key={sibling.id} variant="outline" className="text-xs">
              {sibling.name.split(' ')[0]}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">None</span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === 'registered'
            ? 'default'
            : row.original.status === 'enrolled'
              ? 'secondary'
              : 'outline'
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
]
