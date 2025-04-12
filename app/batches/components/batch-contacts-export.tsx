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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BatchStudentData } from '@/lib/actions/get-batch-data'
import { getBatchStyle } from '@/lib/config/batch-styles'
import { StudentStatus } from '@/lib/types/student'
import {
  generateBatchVCards,
  getContactPreview,
} from '@/lib/utils/vcard-generator'

interface BatchContactsExportProps {
  students: BatchStudentData[]
  batches: Array<{ id: string; name: string }>
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedBatch: string
  totalContacts: number
  missingDataCount: number
  previewContact?: ReturnType<typeof getContactPreview>
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedBatch,
  totalContacts,
  missingDataCount,
  previewContact,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download {selectedBatch} Contacts</DialogTitle>
          <DialogDescription>
            This will generate a VCard file with all student contacts from{' '}
            {selectedBatch}.
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
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.name ?? '')

  const activeStudents = students.filter(
    (student) =>
      student.status !== StudentStatus.WITHDRAWN &&
      student.batch?.name === selectedBatch
  )

  const handleDownload = async () => {
    try {
      setIsLoading(true)
      const result = generateBatchVCards(activeStudents, selectedBatch)
      const blob = new Blob([result.vcf], { type: 'text/vcard;charset=utf-8' })
      saveAs(blob, `${selectedBatch}-contacts.vcf`)
      toast.success('Contacts downloaded successfully')
    } catch (error) {
      console.error('Error downloading contacts:', error)
      toast.error('Failed to download contacts')
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const preview =
    activeStudents.length > 0
      ? getContactPreview(activeStudents[0], selectedBatch)
      : undefined

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="contacts">
        <AccordionTrigger>Export Contacts</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.name}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className={getBatchStyle(selectedBatch).className}
                  >
                    {selectedBatch}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {activeStudents.length} contacts available
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => setIsOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {isOpen && (
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleDownload}
          selectedBatch={selectedBatch}
          totalContacts={activeStudents.length}
          missingDataCount={
            activeStudents.filter((s) => !s.email || !s.phone).length
          }
          previewContact={preview}
        />
      )}
    </Accordion>
  )
}
