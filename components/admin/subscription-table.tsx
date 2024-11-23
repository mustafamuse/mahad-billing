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
import { formatCurrency, formatDiscountType } from "@/lib/utils";
import { DashboardFilters } from "./dashboard-filters";
import { ChevronLeft, ChevronRight, Loader2, ArrowUpDown, Info } from "lucide-react";
import { ProcessedStudent } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ColumnToggle } from "./column-toggle";

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
  },
  past_due: {
    label: "Past Due",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  },
  unpaid: {
    label: "Unpaid",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  },
  canceled: {
    label: "Canceled",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  },
  not_enrolled: {
    label: "Not Enrolled",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
} as const;

export function SubscriptionTable() {
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [discountType, setDiscountType] = useState("all");
  const [sortConfig, setSortConfig] = useState({ field: "name", order: "asc" });

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc"
    }));
  };

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    payer: true,
    status: true,
    nextPayment: true,
    monthlyAmount: true,
    discount: true,
  });

  const columns = [
    { key: "name", label: "Student Name", isVisible: visibleColumns.name },
    { key: "payer", label: "Payer", isVisible: visibleColumns.payer },
    { key: "status", label: "Status", isVisible: visibleColumns.status },
    { key: "nextPayment", label: "Next Payment", isVisible: visibleColumns.nextPayment },
    { key: "monthlyAmount", label: "Monthly Amount", isVisible: visibleColumns.monthlyAmount },
    { key: "discount", label: "Discount", isVisible: visibleColumns.discount },
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof visibleColumns]
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
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  const renderFilterSummary = () => {
    if (!data) return null;

    if (status === "active") {
      return (
        <div className="bg-muted p-4 rounded-lg mb-4">
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
        <div className="bg-muted p-4 rounded-lg mb-4">
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
        <div className="bg-muted p-4 rounded-lg mb-4">
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
        <div className="bg-muted p-4 rounded-lg mb-4">
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
        <div className="bg-muted p-4 rounded-lg mb-4">
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
        <div className="bg-muted p-4 rounded-lg mb-4">
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
        <div className="bg-muted p-4 rounded-lg mb-4">
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

    if (status !== "all" && discountType !== "all") {
      const totalRevenue = data?.students.reduce((sum: number, student: { monthlyAmount: number; }) => sum + student.monthlyAmount, 0) || 0;
      const percentageOfTotal = ((data?.filteredCount || 0) / (data?.totalStudents || 1)) * 100;

      return (
        <div className="bg-muted p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">
                {data.filteredCount} students match all filters
              </span>
              <span className="text-muted-foreground ml-2">
                ({percentageOfTotal.toFixed(1)}% of total)
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Combined Revenue
              </div>
              <div className="font-medium text-lg">
                {formatCurrency(totalRevenue)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <DashboardFilters 
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onDiscountTypeChange={setDiscountType}
          />
          <ColumnToggle 
            columns={columns}
            onToggleColumn={toggleColumn}
          />
        </div>
        
        {renderFilterSummary()}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => column.isVisible && (
                  <TableHead key={column.key} className="w-[200px]">
                    <div className="flex items-center">
                      <Button 
                        variant="ghost" 
                        className="font-medium p-0 hover:bg-transparent"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : data?.students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                data?.students.map((student: ProcessedStudent) => (
                  <TableRow key={student.id}>
                    {visibleColumns.name && (
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                    )}
                    {visibleColumns.payer && (
                      <TableCell>
                        {student.status === "not_enrolled" ? (
                          <Badge 
                            variant="secondary"
                            className={statusConfig["not_enrolled"].color}
                          >
                            Not Enrolled
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{student.guardian.name || "No payer assigned"}</div>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{student.guardian.email || "No email"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={statusConfig[student.status as keyof typeof statusConfig].color}
                        >
                          {statusConfig[student.status as keyof typeof statusConfig].label}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.nextPayment && (
                      <TableCell>
                        {student.status === "not_enrolled" ? 
                          <Badge 
                            variant="secondary"
                            className={statusConfig["not_enrolled"].color}
                          >
                            N/A
                          </Badge> :
                          student.currentPeriodEnd ? 
                            new Date(student.currentPeriodEnd * 1000).toLocaleDateString() :
                            "No date set"
                        }
                      </TableCell>
                    )}
                    {visibleColumns.monthlyAmount && (
                      <TableCell>
                        {student.status === "not_enrolled" ? (
                          <Badge 
                            variant="secondary"
                            className={statusConfig["not_enrolled"].color}
                          >
                            Would pay {formatCurrency(student.monthlyAmount)}
                          </Badge>
                        ) : (
                          formatCurrency(student.monthlyAmount)
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.discount && (
                      <TableCell>
                        <div className="flex items-center">
                          {student.discount.amount > 0 ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                              {formatDiscountType(student.discount.type, student.discount.amount)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
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
    </TooltipProvider>
  );
} 