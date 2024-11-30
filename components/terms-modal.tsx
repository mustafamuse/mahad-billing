"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgree?: () => void
}

export function TermsModal({ open, onOpenChange, onAgree }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please review our terms and conditions carefully
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1 my-6">
          <div className="space-y-6 pr-4">
            <section>
              <h3 className="font-semibold text-base mb-2">Authorization</h3>
              <p className="text-sm text-muted-foreground">
                By agreeing to these terms, you authorize Irshād Mahad to automatically charge the provided payment method for monthly tuition fees.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Recurring Payments</h3>
              <p className="text-sm text-muted-foreground">
                Payments will be processed on the 1st of each month. You are responsible for ensuring sufficient funds are available.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Refund Policy</h3>
              <p className="text-sm text-muted-foreground">
                Tuition fees are non-refundable once the month has started. Refunds for canceled enrollment or overpayments may be considered on a case-by-case basis.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Failed Payments</h3>
              <p className="text-sm text-muted-foreground">
                If a payment fails due to insufficient funds or an expired payment method, you will be notified to update your payment details. Failure to resolve payment issues may result in suspension of services.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Cancellations and Changes</h3>
              <p className="text-sm text-muted-foreground">
                To cancel or adjust your payment plan, you must notify Irshād Mahad at least 5 business days before the next billing cycle.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Privacy and Security</h3>
              <p className="text-sm text-muted-foreground">
                Your payment information is securely stored and processed in compliance with industry standards. Irshād Mahad does not share your payment details with third parties.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="sm:w-auto w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onAgree && (
            <Button 
              className="sm:w-auto w-full"
              onClick={() => {
                onAgree()
                onOpenChange(false)
              }}
            >
              I Agree
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 