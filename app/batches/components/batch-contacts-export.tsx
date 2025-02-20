'use client'

import { useState } from 'react'

import { saveAs } from 'file-saver'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BatchStudentData } from '@/lib/actions/get-batch-data'
import { getBatchStyle } from '@/lib/config/batch-styles'
import {
  generateBatchVCards,
  getContactPreview,
} from '@/lib/utils/vcard-generator'

interface BatchContactsExportProps {
  students: BatchStudentData[]
  batches: Array<{ id: string; name: string; studentCount: number }>
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  batchName: string
  totalContacts: number
  missingDataCount: number
  previewContact?: ReturnType<typeof getContactPreview>
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  batchName,
  totalContacts,
  missingDataCount,
  previewContact,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download {batchName} Contacts</DialogTitle>
          <DialogDescription>
            This will generate a VCard file with all student contacts from{' '}
            {batchName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Contact Details:</h4>
            <ul className="space-y-2 text-sm">
              <li>Total Contacts: {totalContacts}</li>
              <li>Contacts with Missing Data: {missingDataCount}</li>
            </ul>
          </div>
          {previewContact && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">Sample Contact:</h4>
              <div className="space-y-1 text-sm">
                <p>Name: {previewContact.fullName}</p>
                <p>Email: {previewContact.email || '(missing)'}</p>
                <p>Phone: {previewContact.phone || '(missing)'}</p>
              </div>
            </div>
          )}
          {missingDataCount > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/30 dark:bg-yellow-900/20 dark:text-yellow-200">
              Warning: {missingDataCount} contacts have missing email or phone
              information.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Download Contacts</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BatchContactsExport({
  students,
  batches,
}: BatchContactsExportProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<{
    name: string
    contacts: number
    missing: number
    preview?: ReturnType<typeof getContactPreview>
  } | null>(null)

  const handleDownload = async (batchId: string, batchName: string) => {
    try {
      setIsLoading(batchId)
      const batchStudents = students.filter((s) => s.batch?.id === batchId)
      const result = generateBatchVCards(batchStudents, batchName)

      const blob = new Blob([result.vcf], { type: 'text/vcard' })
      saveAs(blob, `${batchName.replace(/\s+/g, '-')}-student-contacts.vcf`)

      toast.success(
        `Downloaded ${result.totalContacts} contacts from ${batchName}`
      )
    } catch (error) {
      console.error('Failed to generate contacts:', error)
      toast.error('Failed to generate contacts')
    } finally {
      setIsLoading(null)
      setSelectedBatch(null)
    }
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="contacts">
        <AccordionTrigger className="text-lg font-medium">
          Download Student Contacts
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            {batches.map((batch) => {
              const style = getBatchStyle(batch.name)
              const batchStudents = students.filter(
                (s) => s.batch?.id === batch.id
              )
              const preview =
                batchStudents[0] &&
                getContactPreview(batchStudents[0], batch.name)
              const result = generateBatchVCards(batchStudents, batch.name)

              return (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={style.variant}
                        className={style.className}
                      >
                        {batch.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({result.totalContacts} contacts)
                      </span>
                    </div>
                    {result.contactsWithMissingData > 0 && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {result.contactsWithMissingData} contacts missing data
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading === batch.id}
                    onClick={() =>
                      setSelectedBatch({
                        name: batch.name,
                        contacts: result.totalContacts,
                        missing: result.contactsWithMissingData,
                        preview,
                      })
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              )
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      {selectedBatch && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setSelectedBatch(null)}
          onConfirm={() => {
            const batch = batches.find((b) => b.name === selectedBatch.name)
            if (batch) {
              handleDownload(batch.id, batch.name)
            }
          }}
          batchName={selectedBatch.name}
          totalContacts={selectedBatch.contacts}
          missingDataCount={selectedBatch.missing}
          previewContact={selectedBatch.preview}
        />
      )}
    </Accordion>
  )
}
