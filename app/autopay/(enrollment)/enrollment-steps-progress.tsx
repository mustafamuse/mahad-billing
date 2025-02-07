import React from 'react'

import { BadgeCheck, Banknote, UserRound } from 'lucide-react'

interface StepsProgressProps {
  currentStep: number
}

export function EnrollmentStepsProgress({ currentStep }: StepsProgressProps) {
  // Convert 0-based step to 1-based for visual representation
  const displayStep = currentStep + 1

  return (
    <div className="mb-8 flex justify-center">
      <div className="flex items-center space-x-2">
        {/* Student Info Step (Step 0) */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${displayStep > 1 ? 'bg-green-100 text-green-600' : displayStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {displayStep > 1 ? (
            <BadgeCheck className="h-5 w-5" />
          ) : (
            <UserRound className="h-5 w-5" />
          )}
        </div>
        <div
          className={`text-sm font-medium ${displayStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Student Info
        </div>
        <div className="h-0.5 w-12 bg-gray-200" />

        {/* Contact Info Step (Step 1) */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${displayStep > 2 ? 'bg-green-100 text-green-600' : displayStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {displayStep > 2 ? (
            <BadgeCheck className="h-5 w-5" />
          ) : (
            <UserRound className="h-5 w-5" />
          )}
        </div>
        <div
          className={`text-sm font-medium ${displayStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Contact Info
        </div>
        <div className="h-0.5 w-12 bg-gray-200" />

        {/* Payment Setup Step (Step 2) */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${displayStep > 3 ? 'bg-green-100 text-green-600' : displayStep === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {displayStep > 3 ? (
            <BadgeCheck className="h-5 w-5" />
          ) : (
            <Banknote className="h-5 w-5" />
          )}
        </div>
        <div
          className={`text-sm font-medium ${displayStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Payment Setup
        </div>
      </div>
    </div>
  )
}
