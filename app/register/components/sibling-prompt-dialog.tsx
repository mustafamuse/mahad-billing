import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SiblingPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (hasSiblings: boolean) => void
}

export function SiblingPromptDialog({
  open,
  onOpenChange,
  onConfirm,
}: SiblingPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>One More Question</DialogTitle>
          <DialogDescription>
            Do you have any siblings studying at the Mahad?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              onConfirm(true)
              onOpenChange(false)
            }}
          >
            Yes, Add Siblings Now
          </Button>
          <Button
            onClick={() => {
              onConfirm(false)
              onOpenChange(false)
            }}
          >
            No, Complete Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
