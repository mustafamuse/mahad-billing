'use client'

import { useState } from 'react'

import { Wallet } from 'lucide-react'

import { BankVerificationForm } from '@/components/bank-verification-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function BankVerificationButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="mx-auto"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Complete Bank Verification
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Bank Verification</DialogTitle>
            <DialogDescription>
              Enter the two micro-deposit amounts that were sent to your bank
              account to complete your enrollment.
            </DialogDescription>
          </DialogHeader>

          <BankVerificationForm
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
