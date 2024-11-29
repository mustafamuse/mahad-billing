import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ProcessedStudent, Student } from "@/lib/types";
import { calculateStudentPrice } from "@/lib/utils";
import { STUDENTS } from "@/lib/data";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Initialize Stripe with proper error handling
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

// Input validation schema
const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.string().optional(),
  search: z.string().optional(),
  discountType: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function GET(request: Request) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = QuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryResult.error },
        { status: 400 }
      );
    }

    const { page, limit, status, search, discountType, sortBy, sortOrder } = queryResult.data;

    // Fetch subscriptions with proper error handling
    const subscriptions = await stripe.subscriptions.list({
      expand: ["data.customer", "data.default_payment_method", "data.latest_invoice"],
      limit: 100, // Adjust based on your needs
    }).catch((error) => {
      console.error("Stripe API error:", error);
      throw new Error("Failed to fetch subscriptions");
    });

    // Process subscriptions with proper type safety
    const subscribedStudentsMap = new Map<string, {
      subscription: Stripe.Subscription;
      customer: Stripe.Customer;
      price: number;
    }>();

    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {};
      try {
        const students = JSON.parse(metadata.students || "[]");
        students.forEach((student: Student) => {
          subscribedStudentsMap.set(student.name, {
            subscription,
            customer: subscription.customer as Stripe.Customer,
            price: calculateStudentPrice(student).price,
          });
        });
      } catch (e) {
        console.error("Error parsing students metadata:", e);
      }
    });

    let processedStudents = STUDENTS.map((student) => {
      const subscriptionData = subscribedStudentsMap.get(student.name);
      const {
        price = 0,
        discount = 0,
        isSiblingDiscount = false,
      } = calculateStudentPrice(student);

      const getFamilyDiscountRate = (totalMembers?: number) => {
        if (!totalMembers) return 0;
        if (totalMembers >= 4) return 30;
        if (totalMembers === 3) return 20;
        if (totalMembers === 2) return 10;
        return 0;
      };

      return {
        id: student.id,
        name: student.name,
        subscriptionId: subscriptionData?.subscription?.id || null,
        status: subscriptionData?.subscription?.status || "not_enrolled",
        currentPeriodEnd:
          subscriptionData?.subscription?.current_period_end || null,
        guardian: subscriptionData
          ? {
              id: subscriptionData.customer.id,
              name: subscriptionData.customer.name,
              email: subscriptionData.customer.email,
            }
          : {
              id: "",
              name: null,
              email: null,
            },
        monthlyAmount: subscriptionData ? price : price,
        discount: {
          amount: discount,
          type: isSiblingDiscount
            ? "Family Discount"
            : discount > 0
            ? "Other"
            : "None",
          percentage: isSiblingDiscount
            ? getFamilyDiscountRate(student.totalFamilyMembers)
            : 0,
        },
        familyId: student.familyId,
        totalFamilyMembers: student.totalFamilyMembers,
        revenue: {
          monthly: subscriptionData ? price : 0,
          annual: subscriptionData ? price * 12 : 0,
          lifetime: 0,
        },
        isEnrolled: !!subscriptionData,
      };
    });

    if (search) {
      const searchLower = search.toLowerCase();
      processedStudents = processedStudents.filter((student) =>
        student.name.toLowerCase().includes(searchLower)
      );
    }

    if (status && status !== "all") {
      processedStudents = processedStudents.filter((student) =>
        status === "not_enrolled"
          ? !student.isEnrolled
          : student.status === status
      );
    }

    if (discountType && discountType !== "all") {
      processedStudents = processedStudents.filter(
        (student) => student.discount.type === discountType
      );
    }

    if (sortBy) {
      processedStudents.sort((a, b) => {
        switch (sortBy) {
          case "amount":
            if (a.status === "not_enrolled" && b.status !== "not_enrolled")
              return 1;
            if (a.status !== "not_enrolled" && b.status === "not_enrolled")
              return -1;
            return sortOrder === "desc"
              ? b.monthlyAmount - a.monthlyAmount
              : a.monthlyAmount - b.monthlyAmount;

          case "name":
            return sortOrder === "desc"
              ? b.name.localeCompare(a.name)
              : a.name.localeCompare(b.name);

          case "status":
            return sortOrder === "desc"
              ? b.status.localeCompare(a.status)
              : a.status.localeCompare(b.status);

          case "discount":
            if (a.discount.amount === 0 && b.discount.amount > 0) return 1;
            if (a.discount.amount > 0 && b.discount.amount === 0) return -1;
            return sortOrder === "desc"
              ? b.discount.amount - a.discount.amount
              : a.discount.amount - b.discount.amount;

          default:
            return 0;
        }
      });
    }

    // Calculate totals before pagination
    const filteredCount = processedStudents.length;
    const unenrolledStudents = processedStudents.filter(
      (s) => s.status === "not_enrolled"
    ) as ProcessedStudent[];
    const filteredUnenrolledCount = unenrolledStudents.length;

    // Calculate potential revenue for unenrolled students
    const calculatePotentialRevenue = (student: ProcessedStudent) => {
      const baseRate = 150; // Base monthly rate

      // If student has family members, apply the appropriate discount
      let finalPrice = baseRate;
      if (student.familyId && student.totalFamilyMembers) {
        if (student.totalFamilyMembers >= 4) {
          finalPrice = baseRate * 0.7; // 30% discount
        } else if (student.totalFamilyMembers === 3) {
          finalPrice = baseRate * 0.8; // 20% discount
        } else if (student.totalFamilyMembers === 2) {
          finalPrice = baseRate * 0.9; // 10% discount
        }
      }

      return finalPrice;
    };

    const potentialRevenue = unenrolledStudents.reduce((total, student) => {
      return total + calculatePotentialRevenue(student);
    }, 0);

    // Calculate active-specific metrics
    const activeStudents = processedStudents.filter(
      (s) => s.status === "active"
    );
    const activeRevenue = activeStudents.reduce(
      (sum, student) => sum + student.monthlyAmount,
      0
    );
    const averageActiveRevenue =
      activeStudents.length > 0 ? activeRevenue / activeStudents.length : 0;

    // Calculate past due metrics
    const pastDueStudents = processedStudents.filter(
      (s) => s.status === "past_due" || s.status === "unpaid"
    );
    const pastDueRevenue = pastDueStudents.reduce(
      (sum, student) => sum + student.monthlyAmount,
      0
    );
    const averagePastDueAmount =
      pastDueStudents.length > 0 ? pastDueRevenue / pastDueStudents.length : 0;

    // Calculate canceled metrics
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const canceledStudents = processedStudents.filter(
      (s) => s.status === "canceled"
    );
    const canceledRevenue = canceledStudents.reduce(
      (sum, student) => sum + student.monthlyAmount,
      0
    );
    const lastMonthCanceled = canceledStudents.filter((student) => {
      if (!student.currentPeriodEnd) return false;
      const cancelDate = new Date(student.currentPeriodEnd * 1000);
      return cancelDate >= lastMonth && cancelDate <= now;
    }).length;

    // Calculate family discount metrics
    const familyDiscountStudents = processedStudents.filter(
      (s) => s.discount.type === "Family Discount"
    );
    const familyDiscountTotal = familyDiscountStudents.reduce(
      (sum, student) => sum + student.discount.amount,
      0
    );
    const averageFamilyDiscount =
      familyDiscountStudents.length > 0
        ? familyDiscountTotal / familyDiscountStudents.length
        : 0;

    // Calculate no discount metrics
    const noDiscountStudents = processedStudents.filter(
      (s) => s.discount.type === "None"
    );
    const noDiscountRevenue = noDiscountStudents.reduce(
      (sum, student) => sum + student.monthlyAmount,
      0
    );

    // Apply pagination after calculating totals
    const start = (page - 1) * limit;
    const paginatedStudents = processedStudents.slice(start, start + limit);
    const hasMore = start + limit < processedStudents.length;
    const nextCursor = hasMore ? processedStudents[start + limit - 1].id : null;

    // Return response with proper caching headers
    return NextResponse.json(
      {
        students: paginatedStudents,
        hasMore,
        nextCursor,
        totalStudents: STUDENTS.length,
        filteredCount: processedStudents.length,
        activeCount: activeStudents.length,
        activeRevenue,
        averageActiveRevenue,
        unenrolledCount: filteredUnenrolledCount,
        potentialRevenue,
        pastDueCount: pastDueStudents.length,
        pastDueRevenue,
        averagePastDueAmount,
        canceledCount: canceledStudents.length,
        canceledRevenue,
        lastMonthCanceled,
        familyDiscountCount: familyDiscountStudents.length,
        familyDiscountTotal,
        averageFamilyDiscount,
        noDiscountCount: noDiscountStudents.length,
        noDiscountRevenue,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minutes cache
          'Vary': 'Authorization'
        }
      }
    );
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch dashboard data",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
