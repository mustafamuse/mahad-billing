# Dashboard Design Document

## Subscription Table Design

### Data Sources

- Prisma Database (Student, Payer, Subscription models)
- Stripe Webhook Events
- Payment Processing History

### Available Data Fields

#### Student Information

- `id`: string
- `name`: string
- `email`: string (optional)
- `className`: string
- `monthlyRate`: number
- `customRate`: boolean
- `discountApplied`: number (optional)
- `status`: StudentStatus
- `payerId`: string (optional)
- `familyId`: string (optional)
- `lastPaymentDate`: DateTime (optional)
- `nextPaymentDue`: DateTime (optional)

#### Payer Information

- `id`: string
- `name`: string
- `email`: string
- `phone`: string
- `stripeCustomerId`: string
- `relationship`: string (nullable)
- `isActive`: boolean

#### Subscription Information

- `id`: string
- `stripeSubscriptionId`: string
- `payerId`: string
- `status`: SubscriptionStatus
- `lastPaymentDate`: DateTime (optional)
- `nextPaymentDate`: DateTime (optional)
- `currentPeriodStart`: DateTime (optional)
- `currentPeriodEnd`: DateTime (optional)
- `paymentRetryCount`: number
- `lastPaymentError`: string (optional)
- `gracePeriodEndsAt`: DateTime (optional)

### Table Features

#### Columns

1. Selection Checkbox
2. Student Name
3. Payer Details (Name, Email, Relationship)
4. Subscription Status
   - Active
   - Past Due
   - Canceled
   - Inactive
   - Incomplete
   - Trialing
5. Payment Information
   - Last Payment Date
   - Next Payment Due
   - Monthly Rate
   - Applied Discounts
6. Family Information
   - Family ID
   - Siblings Count
   - Total Family Discount
7. Actions Column
   - View Details
   - Manage Subscription
   - Payment History

#### Filtering Options

1. Status Filter

   - All Statuses
   - Active
   - Past Due
   - Canceled
   - Incomplete
   - Trial

2. Payment Filter

   - All
   - Paid
   - Overdue
   - Grace Period
   - Failed Payments

3. Discount Filter
   - All
   - Family Discount
   - Custom Rate
   - No Discount

#### Sorting Options

- Student Name
- Payment Amount
- Last Payment Date
- Next Payment Date
- Status
- Payer Name

#### Bulk Actions

- Update Status
- Send Payment Reminder
- Export Selected
- Cancel Subscriptions
- Apply Discount

### Summary Statistics

1. Payment Overview

   - Total Monthly Revenue
   - Active Subscriptions
   - Past Due Amount
   - Total Discounts Applied

2. Student Status Breakdown

   - Total Students
   - Active Students
   - Past Due Students
   - Canceled Students

3. Financial Metrics
   - Average Revenue per Student
   - Total Family Discounts
   - Revenue at Risk (Past Due)
   - Collection Rate

### Implementation Notes

#### API Endpoints

```typescript
// GET /api/admin/subscriptions
interface SubscriptionQueryParams {
  page: number
  limit: number
  status?: SubscriptionStatus
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  discountType?: string
  paymentStatus?: string
}

// Response Interface
interface SubscriptionResponse {
  students: ProcessedStudent[]
  totalCount: number
  activeCount: number
  pastDueCount: number
  canceledCount: number
  metrics: {
    totalRevenue: number
    totalDiscounts: number
    averageRevenue: number
    collectionRate: number
  }
  pagination: {
    hasMore: boolean
    nextCursor: string | null
  }
}
```

#### Real-time Updates

- WebSocket connection for live status updates
- Instant notification for payment status changes
- Real-time metrics update

#### Performance Considerations

- Implement pagination
- Cache frequently accessed data
- Optimize database queries
- Use server-side filtering and sorting
- Implement virtual scrolling for large datasets

#### Security

- Role-based access control
- Audit logging for all actions
- Secure API endpoints
- Data encryption for sensitive information
