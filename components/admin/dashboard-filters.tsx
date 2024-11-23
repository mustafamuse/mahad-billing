"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardFiltersProps {
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onDiscountTypeChange: (type: string) => void;
}

const statusConfig = {
  all: { label: "All Statuses" },
  active: { label: "Active" },
  not_enrolled: { label: "Not Enrolled" },
  past_due: { label: "Past Due" },
  unpaid: { label: "Unpaid" },
  canceled: { label: "Canceled" },
} as const;

const discountConfig = {
  all: { label: "Show All" },
  "Family Discount": { label: "Family Discount" },
  "None": { label: "No Discount" },
  "Other": { label: "Other Discount" },
} as const;

export function DashboardFilters({ 
  onSearchChange, 
  onStatusChange,
  onDiscountTypeChange 
}: DashboardFiltersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [discountType, setDiscountType] = useState("all");

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Search Input */}
      <div className="relative flex-grow max-w-[350px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSearchChange(e.target.value);
          }}
          className="pl-10 pr-4 h-10 w-full bg-background border-input text-sm"
        />
      </div>

      {/* Status Filter */}
      <Select
        defaultValue="active"
        value={status}
        onValueChange={(value) => {
          setStatus(value);
          onStatusChange(value);
        }}
      >
        <SelectTrigger className="w-[180px] h-10">
          <SelectValue>
            {statusConfig[status as keyof typeof statusConfig]?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, config]) => (
            <SelectItem 
              key={key} 
              value={key}
            >
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Discount Filter */}
      <Select
        value={discountType}
        onValueChange={(value) => {
          setDiscountType(value);
          onDiscountTypeChange(value);
        }}
      >
        <SelectTrigger className="w-[180px] h-10">
          <SelectValue>
            {discountConfig[discountType as keyof typeof discountConfig]?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(discountConfig).map(([key, config]) => (
            <SelectItem 
              key={key} 
              value={key}
            >
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
