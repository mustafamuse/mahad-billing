'use client'

import { SubscriptionStatus } from '@prisma/client'
import { format } from 'date-fns'
import { Mail, Phone, User, Users, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn, getStatusColor } from '@/lib/utils'

interface Student {
  id: string
  name: string
  status: SubscriptionStatus
  monthlyAmount: number
  nextPaymentDate: string
}

interface PayorDetailsSliderProps {
  isOpen: boolean
  onClose: () => void
  payorName: string
  payorEmail: string
  payorPhone: string
  students: Student[]
}

export function PayorDetailsSlider({
  isOpen,
  onClose,
  payorName,
  payorEmail,
  payorPhone,
  students,
}: PayorDetailsSliderProps) {
  const totalMonthlyAmount = students.reduce(
    (sum, student) => sum + student.monthlyAmount,
    0
  )

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-2xl">{payorName}</SheetTitle>
          <SheetDescription>View and manage payor details</SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Contact Information
              </h3>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{payorEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{payorPhone}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Quick Actions
              </h3>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
                <Button variant="outline" className="justify-start">
                  <Phone className="mr-2 h-4 w-4" />
                  Call Payor
                </Button>
                <Button variant="outline" className="justify-start">
                  <Wallet className="mr-2 h-4 w-4" />
                  Send Payment Reminder
                </Button>
              </div>
            </div>

            {/* Associated Students */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Associated Students
                </h3>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {students.length} student{students.length !== 1 && 's'}
                  </span>
                </div>
              </div>
              <div className="grid gap-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="rounded-lg border bg-card p-4 text-card-foreground"
                  >
                    <div className="flex items-start justify-between">
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{student.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${student.monthlyAmount}/month
                        </div>
                      </div>
                      <div
                        className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          getStatusColor(student.status)
                        )}
                      >
                        {student.status}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Next payment:{' '}
                      {format(new Date(student.nextPaymentDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Payment Summary
              </h3>
              <div className="rounded-lg border bg-card p-4 text-card-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Total Monthly Amount
                  </span>
                  <span className="text-lg font-bold">
                    ${totalMonthlyAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
