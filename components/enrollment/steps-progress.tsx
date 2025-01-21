import React from 'react'

import { BadgeCheck, Banknote, UserRound } from 'lucide-react'

interface StepsProgressProps {
  currentStep: number
}

export function StepsProgress({ currentStep }: StepsProgressProps) {
  return (
    <div className="mb-8 flex justify-center">
      <div className="flex items-center space-x-2">
        {/* Student Info Step */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">Student Info</div>
        <div className="h-0.5 w-12 bg-gray-200" />

        {/* Contact Info Step */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep >= 2 ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}
        >
          {currentStep >= 2 ? (
            <BadgeCheck className="h-5 w-5" />
          ) : (
            <UserRound className="h-5 w-5" />
          )}
        </div>
        <div
          className={`text-sm font-medium ${currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Contact Info
        </div>
        <div className="h-0.5 w-12 bg-gray-200" />

        {/* Payment Setup Step */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep >= 3 ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}
        >
          {currentStep >= 3 ? (
            <BadgeCheck className="h-5 w-5" />
          ) : (
            <Banknote className="h-5 w-5" />
          )}
        </div>
        <div
          className={`text-sm font-medium ${currentStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Payment Setup
        </div>
      </div>
    </div>
  )
}
