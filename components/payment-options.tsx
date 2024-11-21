"use client";

import { formatCurrency } from "@/lib/utils";

interface PaymentOptionsProps {
  total: number;
}

export function PaymentOptions({ total }: PaymentOptionsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Payment Summary</h2>
      
      <div className="bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col space-y-2">
          <span className="font-medium">Monthly Recurring Subscription</span>
          <span className="text-sm text-muted-foreground">
            Starting next month
          </span>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-foreground">
            Total Amount:
          </span>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">
              {formatCurrency(total)}
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              per month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}