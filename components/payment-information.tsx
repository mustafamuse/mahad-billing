"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentInformationProps {
  form: UseFormReturn<any>;
}

export function PaymentInformation({ form }: PaymentInformationProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payment Information</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountHolderName">Account Holder Name</Label>
          <Input
            id="accountHolderName"
            {...form.register("accountHolderName")}
            placeholder="Enter account holder name"
          />
          {form.formState.errors.accountHolderName && (
            <p className="text-sm text-red-500">
              {form.formState.errors.accountHolderName.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="routingNumber">Routing Number</Label>
          <Input
            id="routingNumber"
            {...form.register("routingNumber")}
            placeholder="Enter 9-digit routing number"
            maxLength={9}
          />
          {form.formState.errors.routingNumber && (
            <p className="text-sm text-red-500">
              {form.formState.errors.routingNumber.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            type="password"
            {...form.register("accountNumber")}
            placeholder="Enter account number"
          />
          {form.formState.errors.accountNumber && (
            <p className="text-sm text-red-500">
              {form.formState.errors.accountNumber.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmAccountNumber">Confirm Account Number</Label>
          <Input
            id="confirmAccountNumber"
            type="password"
            {...form.register("confirmAccountNumber")}
            placeholder="Confirm account number"
          />
          {form.formState.errors.confirmAccountNumber && (
            <p className="text-sm text-red-500">
              {form.formState.errors.confirmAccountNumber.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountType">Account Type</Label>
          <Select
            onValueChange={(value) => form.setValue("accountType", value)}
            defaultValue={form.watch("accountType")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Checking</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.accountType && (
            <p className="text-sm text-red-500">
              {form.formState.errors.accountType.message as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}