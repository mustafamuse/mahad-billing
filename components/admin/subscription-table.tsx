"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Info } from "lucide-react";
import { ProcessedStudent } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const statusConfig = {
  all: { label: "All Statuses", color: "bg-gray-500" },
  active: { label: "Active", color: "bg-green-500" },
  not_enrolled: { label: "Not Enrolled", color: "bg-gray-500" },
  past_due: { label: "Past Due", color: "bg-yellow-500" },
  unpaid: { label: "Unpaid", color: "bg-red-500" },
  canceled: { label: "Canceled", color: "bg-red-500" },
} as const;

const discountConfig = {
  all: { label: "All Discounts" },
  "Family Discount": { label: "Family Discount" },
  "None": { label: "No Discount" },
  "Other": { label: "Other Discount" },
} as const;

type SortOrder = "asc" | "desc";

interface SortConfig {
  field: string;
  order: SortOrder;
}

export function SubscriptionTable() {
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<keyof typeof statusConfig>("active");
  const [discountType, setDiscountType] = useState<keyof typeof discountConfig>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    field: "name", 
    order: "asc" 
  });

  const handleSort = (field: string) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc"
    }));
  };

  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", page, cursor, search, status, discountType, sortConfig],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      
      if (cursor) params.set("cursor", cursor);
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (discountType !== "all") params.set("discountType", discountType);
      if (sortConfig.field) {
        params.set("sortBy", sortConfig.field);
        params.set("sortOrder", sortConfig.order);
      }
      
      const response = await fetch(`/api/admin/dashboard?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to fetch students");
      }
      return response.json();
    },
  });

  const columns = [
    { key: "name", label: "Student Name" },
    { key: "payer", label: "Payer" },
    { key: "status", label: "Status" },
    { key: "nextPayment", label: "Next Payment" },
    { key: "monthlyAmount", label: "Monthly Amount" },
    { key: "discount", label: "Discount" },
  ];

  const renderFilterSummary = () => {
    if (!data) return null;

    if (status === "active") {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">
                {data.activeCount} active students
              </span>
              <span className="text-muted-foreground ml-2">
                out of {data.totalStudents} total students
              </span>
            </div>
            <div className="text-right">
              <div className="font-medium text-lg text-green-600 dark:text-green-400">
                {formatCurrency(data.activeRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. {formatCurrency(data.averageActiveRevenue)} per student/month
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (status === "not_enrolled") {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">
                {data.unenrolledCount} students not enrolled
              </span>
              <span className="text-muted-foreground ml-2">
                out of {data.totalStudents} total students
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Monthly Revenue Opportunity
              </div>
              <div className="font-medium text-lg text-green-600 dark:text-green-400">
                {formatCurrency(data.potentialRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Including applicable family discounts
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (status === "past_due" || status === "unpaid") {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-red-600 dark:text-red-400">
                {data.pastDueCount} students with outstanding payments
              </span>
              <span className="text-muted-foreground ml-2">
                requiring immediate attention
              </span>
            </div>
            <div className="text-right">
              <div className="font-medium text-lg text-red-600 dark:text-red-400">
                {formatCurrency(data.pastDueRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. {formatCurrency(data.averagePastDueAmount)} per student
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (status === "canceled") {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {data.canceledCount} canceled enrollments
              </span>
              <span className="text-muted-foreground ml-2">
                ({data.lastMonthCanceled} in the last month)
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Lost Monthly Revenue
              </div>
              <div className="font-medium text-lg text-gray-600 dark:text-gray-400">
                {formatCurrency(data.canceledRevenue)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (discountType === "Family Discount") {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">
                {data.familyDiscountCount} students with family discounts
              </span>
              <span className="text-muted-foreground ml-2">
                out of {data.totalStudents} total students
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Total Monthly Discounts
              </div>
              <div className="font-medium text-lg text-blue-600 dark:text-blue-400">
                {formatCurrency(data.familyDiscountTotal)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. {formatCurrency(data.averageFamilyDiscount)} per student
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (discountType === "None") {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">
                {data.noDiscountCount} students paying full tuition
              </span>
              <span className="text-muted-foreground ml-2">
                ({((data.noDiscountCount / data.totalStudents) * 100).toFixed(1)}% of total students)
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Full Rate Revenue
              </div>
              <div className="font-medium text-lg">
                {formatCurrency(data.noDiscountRevenue)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (search) {
      const activeInSearch = data?.students.filter((s: { status: string; }) => s.status === "active").length || 0;
      const notEnrolledInSearch = data?.students.filter((s: { status: string; }) => s.status === "not_enrolled").length || 0;
      const pastDueInSearch = data?.students.filter((s: { status: string; }) => s.status === "past_due" || s.status === "unpaid").length || 0;

      return (
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">
                Found {data.filteredCount} matches
              </span>
              <span className="text-muted-foreground ml-2">
                for &quot;{search}&quot;
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Status Breakdown
              </div>
              <div className="text-sm space-x-2">
                <span className="text-green-600 dark:text-green-400">{activeInSearch} active</span>
                <span>·</span>
                <span className="text-gray-600 dark:text-gray-400">{notEnrolledInSearch} not enrolled</span>
                {pastDueInSearch > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 dark:text-red-400">{pastDueInSearch} past due</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="p-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-grow max-w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by student name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-10 pr-4 h-10 w-full"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={status}
              onValueChange={(value: keyof typeof statusConfig) => setStatus(value)}
            >
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue>
                  {statusConfig[status].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, config]) => (
                  <SelectItem 
                    key={key} 
                    value={key}
                    className="flex items-center gap-2"
                  >
                    <span className={cn("w-2 h-2 rounded-full", config.color)} />
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={discountType}
              onValueChange={(value: keyof typeof discountConfig) => setDiscountType(value)}
            >
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue>
                  {discountConfig[discountType].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(discountConfig) as [keyof typeof discountConfig, typeof discountConfig[keyof typeof discountConfig]][]).map(([key, config]) => (
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
        </div>

        {/* Summary Stats */}
        {renderFilterSummary()}
      </div>

      {/* Table */}
      <div className="border-t">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead 
                    key={column.key}
                    className="cursor-pointer"
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.students?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                data?.students?.map((student: ProcessedStudent) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{student.guardian.name || "No payer assigned"}</span>
                        {student.guardian.email && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{student.guardian.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusConfig[student.status as keyof typeof statusConfig].color}>
                        {statusConfig[student.status as keyof typeof statusConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.currentPeriodEnd 
                        ? new Date(student.currentPeriodEnd * 1000).toLocaleDateString()
                        : "N/A"
                      }
                    </TableCell>
                    <TableCell>{formatCurrency(student.monthlyAmount)}</TableCell>
                    <TableCell>
                      {student.discount.amount > 0 ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {student.discount.type} ({formatCurrency(student.discount.amount)})
                        </Badge>
                      ) : (
                        "None"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (page > 1) {
              setPage(page - 1);
              setCursor(null);
            }
          }}
          disabled={page === 1 || isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (data?.hasMore) {
              setPage(page + 1);
              setCursor(data.nextCursor);
            }
          }}
          disabled={!data?.hasMore || isLoading}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
} 