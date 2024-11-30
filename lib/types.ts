import type Stripe from "stripe";

export interface Student {
  id: string;
  name: string;
  monthlyRate: number;
  familyId?: string;
  totalFamilyMembers?: number;
}

export interface EnrollmentFormData {
  students: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: "checking" | "savings";
  termsAccepted: boolean;
}

export interface DashboardSubscription {
  id: string;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: number;
  customer: {
    name: string | null;
    email: string | null;
    id: string;
  };
  paymentMethod: {
    type: string;
    card?: Stripe.PaymentMethod.Card;
    us_bank_account?: Stripe.PaymentMethod.UsBankAccount;
  } | null;
  latestInvoice: {
    id: string;
    status: string;
    amount_due: number;
    hosted_invoice_url: string | null;
  };
  students: Student[];
  totalAmount: number;
}

export interface DashboardStats {
  totalActiveSubscriptions: number;
  totalStudents: number;
  monthlyRecurringRevenue: number;
  potentialRevenue: number;
  overduePayments: number;
  canceledLastMonth: number;
  averageRevenuePerStudent: number;
  retentionRate: number;
  paymentPatterns: {
    totalLatePayments: number;
    customersWithLatePayments: number;
    averagePaymentDelay: number;
    riskiestCustomers: PaymentPattern[];
    paymentMethodStats: {
      ach: { total: number; successful: number; rate: number };
      card: { total: number; successful: number; rate: number };
    };
  };
  financialHealth: FinancialHealth;
}

export type StudentStatus = Stripe.Subscription.Status | "not_enrolled";

export interface ProcessedStudent {
  id: string;
  name: string;
  subscriptionId: string | null;
  status: StudentStatus;
  currentPeriodEnd: number | null;
  guardian: {
    id: string;
    name: string | null;
    email: string | null;
  };
  monthlyAmount: number;
  discount: {
    amount: number;
    type: string;
    percentage: number;
  };
  familyId?: string;
  totalFamilyMembers?: number;
  revenue: {
    monthly: number;
    annual: number;
    lifetime: number;
  };
  isEnrolled: boolean;
}

export interface PaymentPattern {
  customerId: string;
  customerName: string;
  paymentHistory: {
    onTimePayments: number;
    latePayments: number;
    failedPayments: number;
    averageDelayDays: number;
  };
  riskScore: number; // 0-100, higher means more risky
  paymentMethodSuccess: {
    total: number;
    successful: number;
    successRate: number;
  };
  flags: {
    isFrequentlyLate: boolean;
    hasMultipleFailures: boolean;
    isHighRisk: boolean;
  };
}

export interface FinancialHealth {
  revenueStability: {
    score: number; // 0-100
    trend: "increasing" | "stable" | "decreasing";
    volatility: number; // Standard deviation of monthly revenue
  };
  cashFlow: {
    currentMonth: number;
    nextMonthPrediction: number;
    predictedGrowth: number;
    riskFactors: string[];
  };
  revenueTargets: {
    monthlyTarget: number;
    currentProgress: number;
    projectedRevenue: number;
    shortfall: number;
    isOnTrack: boolean;
  };
}
