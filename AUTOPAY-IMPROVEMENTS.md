# Autopay System Improvements

## Overview of Changes

We've implemented several critical improvements to the autopay system to address issues with duplicate Stripe customers and abandoned enrollments:

1. **Modified `prepare-setup` endpoint** to check for existing customers before creating new ones
2. **Enhanced webhook event handlers** to better track and manage customer events
3. **Added admin cleanup endpoint** for identifying and resolving duplicate customers
4. **Created scheduled task** to clean up abandoned enrollments

## 1. Preventing Duplicate Customers

The `prepare-setup` endpoint now checks for existing customers in three ways:

- First, it checks if a payer with the same email exists in our database
- If found, it verifies the Stripe customer still exists and updates it
- If not found in our database, it searches Stripe directly for customers with the same email

This prevents the creation of duplicate customers when students retry enrollment or when parents attempt to pay for students who have already started the process.

### Key Changes in `app/api/enrollment/prepare-setup/route.ts`:

- Added checks for existing payers in the database
- Added direct Stripe customer lookup by email
- Improved error handling and logging
- Added metadata to track enrollment status

## 2. Enhanced Webhook Event Handlers

We've improved the webhook event handlers to better track customer-related events:

### Key Changes in `app/api/webhook/event-handlers.ts`:

- Enhanced `handleCustomerCreated` to detect and log potential duplicates
- Improved `handleCustomerUpdated` to track email changes
- Added detailed logging for debugging purposes
- Improved error handling for webhook events

## 3. Admin Cleanup Endpoint

A new admin endpoint has been created to help identify and clean up duplicate customers:

### Features of `app/api/admin/cleanup-duplicates/route.ts`:

- **Scan mode**: Identifies all duplicate customers in the system
- **Fix mode**: Consolidates duplicates for a specific email
- Prioritizes customers with active subscriptions when consolidating
- Moves students from duplicate payers to the primary payer
- Updates Stripe metadata to track consolidated customers

## 4. Scheduled Cleanup Task

A scheduled task has been implemented to automatically clean up abandoned enrollments:

### Features of `app/api/cron/cleanup-abandoned-enrollments/route.ts`:

- Identifies Stripe customers with `enrollmentPending=true` created more than 24 hours ago
- Verifies they have no subscriptions and don't exist in our database
- Marks them as abandoned in Stripe metadata
- Provides detailed reporting on cleanup activities

## Implementation Notes

### Environment Variables

- Ensure `CRON_SECRET_KEY` is set in your environment variables for the scheduled task

### Cron Job Setup

To set up the scheduled cleanup task, configure a cron job to call the endpoint daily:

```
0 0 * * * curl -X POST https://your-domain.com/api/cron/cleanup-abandoned-enrollments -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

### Testing

Before deploying to production:

1. Test the `prepare-setup` endpoint with existing customer emails
2. Verify webhook handlers are correctly processing events
3. Test the admin cleanup endpoint in scan mode first
4. Run the scheduled task manually to verify it works as expected

## Monitoring

Monitor the following after deployment:

- Webhook error rates
- Customer creation events in Stripe
- Database growth rate for the Payer table
- Logs for any unexpected errors

## Future Improvements

Consider implementing:

- Automatic notification when duplicate customers are detected
- Enhanced reporting on abandoned enrollments
- Improved UI feedback when customers attempt to re-enroll
