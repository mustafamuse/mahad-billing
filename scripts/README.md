# Scripts Directory

This directory contains various utility scripts for database management, data migration, and Stripe integration.

## Database Scripts

- **`audit.ts`** - Audit student subscription data and relationships
- **`seed-database.mjs`** - Seed the database with initial data from transformed backup
- **`seed-from-export.ts`** - Seed database from exported data
- **`export-data.mjs`** - Export current database data to JSON
- **`transform-backup.mjs`** - Transform backup data for seeding

## Data Quality Scripts

- **`check-duplicate-emails.ts`** - Check for duplicate email addresses
- **`check-duplicate-names.ts`** - Check for duplicate student names
- **`fix-duplicate-emails.ts`** - Fix duplicate email issues
- **`normalize-student-names.ts`** - Normalize student name formatting

## Stripe Integration Scripts

- **`import-stripe-payments.ts`** - Import payment history from Stripe
- **`reconcile-stripe-subscriptions.ts`** - Reconcile Stripe subscriptions with database
- **`cleanup-stripe.ts`** - Clean up Stripe test data (⚠️ destructive)
- **`test-duplicate-prevention.ts`** - Test duplicate customer prevention logic

## Monitoring Scripts

- **`see-active.ts`** - View active students and subscriptions

## Usage

Run any script with:

```bash
npx ts-node scripts/[script-name].ts
```

For .mjs files:

```bash
node scripts/[script-name].mjs
```

## ⚠️ Important Notes

- Always backup your database before running destructive scripts
- Use `cleanup-stripe.ts` only in test/development environments
- Scripts marked with ⚠️ are destructive and cannot be undone
