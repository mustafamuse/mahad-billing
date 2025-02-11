# Mahad Autopay App - Key Decisions & Recommendations

## Database Schema

### Core Models

```typescript
// 1. Student Model
model Student {
  id                String       @id @default(uuid())
  name              String
  email             String?
  className         String
  monthlyRate       Int         @default(150)
  customRate        Boolean     @default(false)
  discountApplied   Int?
  status            String      @default("available") // available, enrolled, inactive
  payerId           String?     // Optional link to current payer
  familyId          String?     // For sibling grouping
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  payer             Payer?      @relation(fields: [payerId], references: [id])
  familyGroup       FamilyGroup? @relation(fields: [familyId], references: [id])
}

// 2. Payer Model
model Payer {
  id                String    @id @default(uuid())
  name              String
  email             String    @unique
  phone             String
  stripeCustomerId  String    @unique
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  students          Student[]
  subscriptions     Subscription[]
}

// 3. Subscription Model
model Subscription {
  id                  String             @id @default(uuid())
  stripeSubscriptionId String            @unique
  payerId             String
  status              SubscriptionStatus @default(ACTIVE)
  lastPaymentDate     DateTime?
  nextPaymentDate     DateTime?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  canceledAt          DateTime?
  cancelReason        String?
  gracePeriodEndsAt   DateTime?         // New: For tracking payment retry windows
  paymentRetryCount   Int               @default(0)
  lastPaymentError    String?           // New: For tracking failure reasons
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  payer               Payer              @relation(fields: [payerId], references: [id])
}

// 4. SiblingGroup Model
model SiblingGroup {
  id                String    @id @default(uuid())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  students          Student[]
}
```

## Key Decisions

1. **Payment History & Subscription Management**

   - Store minimal subscription data locally for fast queries
   - Always verify with Stripe before updating local data
   - Use Stripe as source of truth for payment history
   - Cache subscription status and important dates locally
   - Implement periodic sync to ensure data consistency

2. **Enrollment & Subscription Flow**

   A. Completion Route (`/api/enrollment/complete`):

   - Validate setup intent and metadata
   - Validate each student's eligibility
   - Create/update payer record
   - Update student statuses to 'enrolled'
   - Create Stripe subscription
   - Return success response
   - No local subscription record creation (handled by webhook)

   B. Webhook Processing:

   - `subscription.created`:
     - Create initial subscription record (INCOMPLETE)
     - Store metadata and billing details
   - `subscription.updated`:
     - Update status and billing cycle dates
     - Handle status transitions
   - `invoice.payment_succeeded`:
     - Update to ACTIVE
     - Update payment dates and billing cycle
   - `invoice.payment_failed`:
     - Handle retry logic
     - Manage grace period
     - Update payment retry count

   C. Student Status Management:

   - Immediate status update on enrollment completion
   - Status transitions based on subscription events
   - Atomic updates with subscription changes

3. **Enhanced Validation Rules**

   A. Student Validation:

   - Verify availability status
   - Check for existing active subscriptions
   - Validate family group relationships
   - Verify custom rates and discounts

   B. Payment Validation:

   - Verify setup intent status
   - Validate payment method type (US bank account)
   - Match total amounts with metadata
   - Verify payer details

   C. Family Group Validation:

   - Verify sibling relationships
   - Validate discount applications
   - Ensure consistent family group assignments

4. **Error Handling & Recovery**

   A. Completion Route Errors:

   - Student validation failures
   - Payment method issues
   - Stripe API errors
   - Database transaction failures

   B. Webhook Processing Errors:

   - Duplicate event handling
   - Missing subscription records
   - Status transition errors
   - Payment processing failures

   C. Recovery Strategies:

   - Automatic retry for transient failures
   - Manual intervention triggers
   - Status reconciliation process
   - Audit logging for debugging

## Open Questions

1. **Sibling Group Management Options**

   Option A: Simple Admin Interface

   - Basic CRUD operations for sibling groups
   - Select students from a list to group them
   - Single admin (you) manages all groupings
   - Simplest to implement

   Option B: Bulk Import/Update

   - Upload spreadsheet with sibling relationships
   - Batch process to create/update groups
   - Good for initial setup and bulk changes

   Option C: Smart Suggestions

   - System suggests potential siblings based on last names
   - Admin confirms or rejects suggestions
   - More complex but helps catch relationships

2. **Payment Failure Handling Options**

   Simple Approach (Recommended):

   - Email notifications to admin for failed payments
   - Weekly summary of all payment statuses
   - Simple admin dashboard showing:
     - Failed payments
     - Retry status
     - Last successful payment date
   - Use Stripe's automatic retry logic (3 attempts)
   - Manual follow-up by admin after final retry

## Resolved Questions

1. **Custom Rates**

   - ✅ No need to track reasons for custom rates
   - ✅ No approval process needed
   - ✅ Simple boolean flag `isCustomRate` is sufficient

2. **Admin Approval**

   - ✅ Single admin system (you)
   - ✅ No complex approval workflows needed
   - ✅ Direct database access for admin operations

3. **Sibling Group Management**

   - ✅ Chosen Option A: Simple Admin Interface
   - ✅ Basic CRUD operations for managing groups
   - ✅ Direct student selection from list
   - ✅ Single admin management

4. **Payment Failure Handling**
   - ✅ Email notifications for failed payments
   - ✅ Weekly payment status summary
   - ✅ Simple admin dashboard
   - ✅ Use Stripe's retry logic
   - ✅ Manual follow-up process

## Areas Needing Clarification

1. **Payment Schedule** ✅

   - Immediate enrollment and first payment upon signup
   - No prorating for mid-month enrollments
   - Subsequent payments on same day of month as initial enrollment
   - Example: If enrolled on March 15th, future payments on 15th of each month

2. **Initial Data Migration** ✅

   - Existing student data will be imported
   - Suggested approach for initial sibling groups:
     a. Create CSV template with columns: StudentID, FirstName, LastName, FamilyGroupID
     b. Add temporary FamilyGroupID in spreadsheet for known siblings
     c. Bulk import using script to create SiblingGroups
     d. Admin interface to review and adjust after import

3. **Communication Flow - Suggested Notifications**

   - Essential Notifications (Phase 1):
     - Payment failure alerts (to admin only)
     - Subscription cancellation confirmations
     - Bank account verification status
   - Future Notifications (Phase 2+):
     - Payment success confirmations
     - Upcoming payment reminders (3 days before)
     - Monthly statements/receipts
     - Account changes (bank, contact info)
     - Welcome email with payment schedule

4. **Payment Confirmations Explained**
   Types of confirmations available:

   - Immediate: After successful payment setup
   - Monthly: When payment processes
   - Annual: Tax receipt/statement
   - On-demand: Through admin dashboard

   Current Decision: ❌ No automatic confirmations in Phase 1

   - Will rely on Stripe Dashboard for payment tracking
   - Can be added in future phases if needed

5. **Admin Dashboard Requirements** ✅

   Key Metrics:

   - Financial Metrics:
     - Total monthly recurring revenue (MRR)
     - Successful vs failed payments
     - Revenue by student/family group
   - Student Metrics:
     - Enrollment duration for each student
     - Payment history length
     - Active vs inactive students
     - Students grouped by payer

   Basic Actions Available:

   - View student details and payment status
   - Manage sibling groups
   - View payer information
   - Access Stripe payment details
   - Cancel/pause subscriptions
   - Update student rates

6. **Error Handling Scenarios** ✅

   Bank Account Changes - UPDATED Approach:

   - Admin-assisted only:
     1. Payer contacts admin about bank change
     2. Admin cancels current payment method in Stripe
     3. Admin updates database status
     4. Payer goes through normal enrollment flow again
     5. System maintains student/family relationships

## Database Review Findings

1. **Schema Design**

   - Balanced approach with local subscription caching
   - Enhanced webhook processing with verification
   - Optimized for ACH payment tracking
   - Clear separation of concerns

2. **Data Synchronization**

   - Stripe remains source of truth
   - Local cache for performance
   - Periodic sync for consistency
   - Webhook-driven updates with verification

3. **Status Management**

   - Student status tied to subscription status
   - Atomic updates via transactions
   - Clear status transitions
   - Audit trail with timestamps

4. **Benefits**

   - Reduced Stripe API calls
   - Fast local queries
   - Reliable status tracking
   - Race condition handling
   - Clear audit trail

5. **Implementation Plan**

   a. Core Infrastructure:

   - Set up subscription sync helpers
   - Implement webhook handlers with verification
   - Create dashboard queries
   - Add logging system

   b. Monitoring & Maintenance:

   - Daily sync job for verification
   - Error monitoring and alerts
   - Status reconciliation tools
   - Performance monitoring

## Code Review Findings

1. **Route Compatibility**

   a. Webhook Route (`/api/webhook/route.ts`):

   - Currently uses WebhookEvent model
   - Needs updates to remove storage
   - Core webhook processing can remain
   - Will need to update status handling

   b. Enrollment Routes:

   - `prepare-setup`: Compatible with new schema
   - `complete`: Needs subscription handling updates
   - Core Stripe integration remains unchanged
   - Student-Payor relationship handling stays same

2. **Payment Components**

   All payment step components are compatible:

   - Use Stripe SDK directly
   - Focus on UI/UX flow
   - No direct database dependencies
   - Can work with simplified schema

3. **Migration Strategy**

   Safe approach for feature branch:

   ```bash
   # Create separate branch
   git checkout -b schema-simplification

   # Generate migration
   npx prisma migrate dev --name simplify_schema --create-only
   ```

   Migration will:

   - Preserve existing data
   - Create new simplified tables
   - Migrate current data
   - Remove unnecessary tables
   - Keep production schema untouched

4. **Required Updates**

   a. Webhook Processing:

   - Remove WebhookEvent model usage
   - Update status handling
   - Keep core event processing

   b. Enrollment Flow:

   - Update student status management
   - Remove subscription model usage
   - Keep Stripe integration intact

   c. Payment Components:

   - No changes needed
   - Already Stripe-focused
   - UI flow remains same

## Implementation Priorities

1. Core Features (Phase 1)

   - Student/Payer data management
   - Basic sibling group management
   - Stripe integration for ACH payments
   - Essential admin controls

2. Payment Processing (Phase 2)

   - Subscription setup
   - Payment processing
   - Basic error handling
   - Simple notifications

3. Admin Tools (Phase 3)

   - Dashboard development
   - Payment monitoring
   - Sibling group management interface
   - Basic reporting

4. Enhancement Features (Phase 4)
   - Advanced notifications
   - Detailed reporting
   - Process optimization
   - Additional admin tools

## Next Steps

1. Review and approve schema changes
2. Update schema.prisma file
3. Create migration plan for existing data
4. Test enrollment flow with new schema
5. Begin implementation of core features

## Notes

- Schema changes focus on simplification
- All core requirements still met
- Reduced complexity = better maintainability
- Stripe remains source of truth for payments

## Subscription Tracking Implementation

### Current State

- Subscription model tracks basic info, status, payment dates, and period tracking
- Webhook handlers process critical subscription events
- Students linked to Payers, who have subscriptions
- Student status indicates: "available", "enrolled", "inactive"

### Implementation Progress

1. Completed:

   - Basic schema design
   - Student and payer models
   - Initial webhook setup
   - Basic validation rules

2. In Progress:

   - Enhanced validation implementation
   - Webhook handler improvements
   - Error recovery mechanisms
   - Logging enhancements

3. Pending:
   - Family group validation
   - Status reconciliation process
   - Audit logging system
   - Recovery automation

## Technical Decisions

1. **Atomic Updates**

   - Use database transactions for related updates
   - Ensure webhook idempotency
   - Maintain data consistency across status changes

2. **Status Management**

   - Student status updated immediately in completion route
   - Subscription status managed through webhooks
   - Grace period tracking for payment failures

3. **Validation Strategy**

   - Pre-validation in completion route
   - Post-validation in webhooks
   - Continuous status verification

4. **Error Recovery**
   - Automatic retries for safe operations
   - Manual triggers for critical failures
   - Comprehensive error logging
   - Status reconciliation process

## Next Steps

1. Update `validateStudentForEnrollment`:

   - Add family group validation
   - Enhance status checks
   - Add custom rate validation
   - Implement sibling discount verification

2. Modify completion route:

   - Remove subscription record creation
   - Add enhanced validation
   - Improve error handling
   - Add detailed logging

3. Enhance webhook handlers:

   - Improve subscription creation logic
   - Add status transition validation
   - Enhance error recovery
   - Implement audit logging

4. Implement monitoring:
   - Add status reconciliation
   - Create audit logs
   - Monitor webhook reliability
   - Track error patterns

### Questions to Address

- How should we handle failed payments for family subscriptions?
- What is the grace period for past due subscriptions?
- Should we implement automatic retries for failed payments?
- How do we handle subscription transfers between payers?

### Technical Decisions Made

1. **Atomic Updates**

   - All subscription status changes are wrapped in transactions
   - Student status is updated automatically with subscription changes
   - Proper error handling and rollback on failure

2. **Status Management**

   - Students remain "enrolled" during PAST_DUE status
   - Only CANCELED status changes student to "inactive"
   - New enrollments require "available" status

3. **Validation Rules**
   - Students must be "available" for new enrollments
   - No duplicate active subscriptions allowed
   - Proper status transitions enforced

# Mahad Autopay App - Implementation Progress

## Current Schema & Status

```typescript
// Core Models - Updated
model Student {
  id                String       @id @default(uuid())
  name              String
  email             String?
  className         String
  monthlyRate       Int         @default(150)
  customRate        Boolean     @default(false)
  discountApplied   Int?
  status            String      @default("available") // available, enrolled, inactive
  payerId           String?
  familyId          String?
  // ... relations
}

model Subscription {
  id                  String             @id @default(uuid())
  stripeSubscriptionId String            @unique
  payerId             String
  status              SubscriptionStatus @default(ACTIVE)
  lastPaymentDate     DateTime?
  nextPaymentDate     DateTime?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  canceledAt          DateTime?
  cancelReason        String?
  gracePeriodEndsAt   DateTime?         // New: For tracking payment retry windows
  paymentRetryCount   Int               @default(0)
  lastPaymentError    String?           // New: For tracking failure reasons
  // ... timestamps and relations
}
```

## Implementation Progress

### Completed (✓)

- Basic schema setup with Student, Payer, and Subscription models
- Added subscription tracking fields (gracePeriod, retryCount, etc.)
- Created helper functions in `lib/queries/subscriptions.ts`:
  - `getStudentSubscriptionStatus`
  - `getPayerActiveSubscriptions`
  - `updateSubscriptionStatus`
  - `validateStudentForEnrollment`

### In Progress (→)

- Updating webhook routes to handle subscription events
- Implementing idempotency checks for webhook processing
- Adding subscription status validation to enrollment routes

### Pending (⚪)

- Creating test cases for subscription flows
- Setting up automated handling for past-due subscriptions
- Implementing admin dashboard views for subscription management

## Key Decisions

### Subscription Status Tracking

- Using enum `SubscriptionStatus` with values:
  - `ACTIVE`: Subscription is current and valid
  - `PAST_DUE`: Payment failed but within grace period
  - `CANCELED`: Subscription terminated
  - `INACTIVE`: No longer in use
  - `INCOMPLETE`: Added for backward compatibility
  - `TRIALING`: Reserved for future use

### Grace Period Handling

- Default grace period: 5 business days
- Maximum payment retries: 3 attempts
- Automatic status updates based on retry count and grace period

### Student Status Management

- Available: No active subscription
- Enrolled: Has active subscription
- Inactive: Subscription canceled or terminated

## Questions to Address

1. **Webhook Processing**

   - How should we handle webhook event data?
   - Do we need to store webhook events for auditing?
   - What retry logic should we implement?

2. **Family Subscriptions**

   - How to handle multiple students under one subscription?
   - Should all students be marked inactive if subscription is canceled?
   - How to manage student transfers between subscriptions?

3. **Grace Period Settings**
   - Is 5 business days sufficient for PAST_DUE grace period?
   - Should grace period be configurable per subscription?
   - How to handle timezone differences in grace period calculations?

## Technical Decisions Made

1. **Atomic Updates**

   - Using transactions for subscription status changes
   - Updating student status alongside subscription changes
   - Maintaining data consistency across related records

2. **Status Management**
   - Tracking both subscription and student status independently
   - Using grace periods for payment retry windows
   - Storing error messages for failed payments

## Next Steps

1. Review and update webhook route implementation
2. Add proper error handling and logging
3. Implement subscription helper functions
4. Create test cases for core functionality

## Simplified Payment Tracking (Stripe Dashboard Integration)

### Overview

We've opted for a simplified approach to payment tracking by leveraging the Stripe Dashboard as the source of truth for payment history. This reduces database complexity while maintaining essential business functionality.

### Key Decisions

1. **Minimal Database Schema**

   - Keep only essential subscription fields
   - Track current status and basic payment dates
   - Maintain link to Stripe via `stripeSubscriptionId`
   - Remove detailed payment history table

2. **Core Functionality**

   - Status synchronization with Stripe events
   - Basic retry counting and grace period tracking
   - Student status management
   - Essential error logging

3. **Business Rules**

   - Grace period: 30 days for failed payments
   - Max retry attempts: 3 before status change
   - Status transitions: active → past_due → inactive
   - Automatic status recovery on successful payment

4. **Support/Admin Operations**
   - Use Stripe Dashboard for detailed payment history
   - Local database for quick status checks
   - Direct links to Stripe for support tasks

### Implementation Details

1. **Subscription Model**

   ```prisma
   model Subscription {
     id                  String             @id @default(uuid())
     stripeSubscriptionId String            @unique
     payerId             String
     status              SubscriptionStatus @default(ACTIVE)
     lastPaymentDate     DateTime?
     nextPaymentDate     DateTime?
     currentPeriodStart  DateTime?
     currentPeriodEnd    DateTime?
     paymentRetryCount   Int               @default(0)
     lastPaymentError    String?
     gracePeriodEndsAt   DateTime?
     createdAt           DateTime          @default(now())
     updatedAt           DateTime          @updatedAt
   }
   ```

2. **Event Handling**

   - Process Stripe webhook events
   - Update local subscription status
   - Manage student enrollment status
   - Track retry attempts and grace periods

3. **Status Management**

   - Keep student and subscription statuses synchronized
   - Update based on payment success/failure
   - Handle grace period transitions
   - Manage family-wide status changes

4. **Support Workflow**
   - Check local database for quick status info
   - Use Stripe Dashboard for detailed payment history
   - Maintain audit trail of status changes
   - Direct links to Stripe for support tasks

### Benefits and Tradeoffs

**Benefits:**

- Simplified database schema
- Reduced complexity in payment tracking
- Reliable source of truth in Stripe
- Lower maintenance overhead

**Tradeoffs:**

- Need to access Stripe Dashboard for detailed history
- Slightly slower access to historical payment data
- More reliance on external system
- Limited offline capabilities

### Migration Notes

1. Keep existing subscriptions table
2. Remove payment history table
3. Update webhook handlers
4. Add grace period and retry tracking
5. Update admin interfaces to link to Stripe

## Student Status System

### Student Enrollment Status

The system maintains a clear separation between student enrollment status and payment/subscription status. Student status represents only the enrollment/attendance state of a student.

```typescript
enum StudentStatus {
  REGISTERED = 'registered', // Initial state, not yet in classes
  ENROLLED = 'enrolled', // Actively attending classes
  ON_LEAVE = 'on_leave', // Temporary approved break
  WITHDRAWN = 'withdrawn', // No longer attending
}
```

### Status Transitions and Update Triggers

1. **REGISTERED → ENROLLED**

   - When: Student completes enrollment process
   - Trigger: Admin approval or automatic upon successful class assignment
   - API: POST /api/enrollment/complete

2. **ENROLLED → ON_LEAVE**

   - When: Student requests temporary break
   - Trigger: Admin approval required
   - API: POST /api/students/{id}/status
   - Requires: Leave duration and reason

3. **ON_LEAVE → ENROLLED**

   - When: Student returns from break
   - Trigger: Automatic on return date or admin action
   - API: POST /api/students/{id}/status
   - Validates: Class availability

4. **ANY → WITHDRAWN**

   - When: Student leaves program
   - Trigger: Parent request or admin action
   - API: POST /api/students/{id}/withdraw
   - Requires: Withdrawal reason
   - Note: Cancels any active subscriptions

5. **WITHDRAWN → REGISTERED**
   - When: Student wants to rejoin
   - Trigger: New registration submission
   - API: POST /api/students/register
   - Requires: New registration form

### Important Notes

1. **Independence from Payments**

   - Student status is independent of payment status
   - A student can be ENROLLED even with payment issues
   - Payment status is tracked separately via subscription status

2. **Data Integrity**

   - All status changes are logged in studentStatusHistory
   - Each change requires a reason and the user who made it
   - Timestamps are maintained for audit purposes

3. **Business Rules**

   - Only ENROLLED students can attend classes
   - ON_LEAVE maintains the student's spot in class
   - WITHDRAWN requires a new registration to return

4. **UI Considerations**
   - Status should be clearly displayed in student lists
   - Color coding:
     - REGISTERED: Blue
     - ENROLLED: Green
     - ON_LEAVE: Yellow
     - WITHDRAWN: Gray

### Related Systems

- Subscription status (payment state) is separate
- Class attendance tracking references enrollment status
- Reports should consider both status types
