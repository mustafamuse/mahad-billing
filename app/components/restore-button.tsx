'use client'

import { useState } from 'react'

import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function RestoreButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleRestore = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    try {
      const backup = JSON.parse(await selectedFile.text())

      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      })

      if (!response.ok) throw new Error('Restore failed')

      const result = await response.json()

      if (result.success) {
        toast.success('Database restored successfully')
        window.location.reload() // Refresh to show restored data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error('Restore failed', {
        description:
          error instanceof Error ? error.message : 'Failed to restore database',
      })
    } finally {
      setIsLoading(false)
      setSelectedFile(null)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Restore Backup
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Database</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace all existing data with the backup data. This
            action cannot be undone.
            <input
              type="file"
              accept=".json"
              className="mt-4 w-full"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              'Restore Database'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
