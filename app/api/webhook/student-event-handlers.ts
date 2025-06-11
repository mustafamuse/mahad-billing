import type { Student } from '@prisma/client'
import { Prisma } from '@prisma/client'
import type { Stripe } from 'stripe'

import { prisma } from '@/lib/db'
import { stripeServerClient as stripe } from '@/lib/stripe'

/**
 * Handles 'checkout.session.completed'
 * Finds a pre-registered student and links them to their new Stripe subscription.
 * This is the primary mechanism for onboarding a new paying student.
 */
export async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  // Exit if this checkout session didn't create a subscription
  if (
    session.mode !== 'subscription' ||
    !session.subscription ||
    !session.customer
  ) {
    console.log(
      `Checkout session ${session.id} is not a subscription creation event. Skipping.`
    )
    return
  }

  // Idempotency Check: Prevent re-linking a subscription
  const existingStudent = await prisma.student.findFirst({
    where: { stripeSubscriptionId: session.subscription as string },
  })

  if (existingStudent) {
    console.log(
      `Student ${existingStudent.id} is already linked to subscription ${session.subscription}. Skipping.`
    )
    return
  }

  let studentToUpdate: Student | null = null

  // 1. Find by name from the custom field.
  const studentNameField = session.custom_fields?.find(
    (f) => f.key === 'studentsemailonethatyouusedtoregister'
  )
  const studentName = studentNameField?.text?.value

  if (studentName) {
    const students = await prisma.student.findMany({
      where: {
        name: { equals: studentName, mode: 'insensitive' },
        stripeSubscriptionId: null,
      },
    })
    if (students.length === 1) {
      studentToUpdate = students[0]
      console.log(`Found unique student by name: ${studentName}`)
    }
  }

  // 2. If not found, find by phone number from the custom field.
  if (!studentToUpdate) {
    const studentPhoneField = session.custom_fields?.find(
      (f) => f.key === 'studentswhatsappthatyouuseforourgroup'
    )
    const studentPhoneFromStripe = studentPhoneField?.numeric?.value

    if (studentPhoneFromStripe) {
      // Normalize the phone number from Stripe by removing non-numeric characters.
      const normalizedPhone = studentPhoneFromStripe.replace(/\D/g, '')

      // Use a raw query to compare the normalized phone number against a normalized
      // `phone` column in the database. This handles format differences (e.g., '123-456-7890' vs '1234567890').
      // NOTE: This syntax `REGEXP_REPLACE` is specific to PostgreSQL (which Supabase uses).
      const students = await prisma.$queryRaw<Student[]>(Prisma.sql`
        SELECT * FROM "Student"
        WHERE REGEXP_REPLACE("phone", '[^0-9]', '', 'g') = ${normalizedPhone}
        AND "stripeSubscriptionId" IS NULL
      `)

      if (students.length === 1) {
        studentToUpdate = students[0]
        console.log(
          `Found unique student by normalized phone: ${normalizedPhone}`
        )
      }
    }
  }

  // 3. If still not found, fall back to the payer's email.
  const payerEmail = session.customer_details?.email
  if (!studentToUpdate && payerEmail) {
    const students = await prisma.student.findMany({
      where: {
        email: { equals: payerEmail, mode: 'insensitive' },
        stripeSubscriptionId: null,
      },
    })
    if (students.length === 1) {
      studentToUpdate = students[0]
      console.log(`Found unique student by payer email: ${payerEmail}`)
    }
  }

  // If a unique student was found by either strategy, link them.
  if (studentToUpdate) {
    await prisma.student.update({
      where: { id: studentToUpdate.id },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        // The subscription is active because the checkout was successful.
        subscriptionStatus: 'active',
        // The student's lifecycle status is now 'enrolled'.
        status: 'enrolled',
        // Update email to the payer's email for billing correspondence
        email: payerEmail,
      },
    })
    console.log(
      `Successfully linked subscription ${session.subscription} to student ${studentToUpdate.name} (${studentToUpdate.id})`
    )
  } else {
    // If no unique student was found, log a detailed warning for manual review.
    const studentPhone = session.custom_fields?.find(
      (f) => f.key === 'studentswhatsappthatyouuseforourgroup'
    )?.numeric?.value
    console.warn(
      `Could not find a unique, unlinked student for subscription ${
        session.subscription
      }. ` +
        `Attempted lookup with name: "${studentName || 'N/A'}", ` +
        `phone: "${studentPhone || 'N/A'}", ` +
        `and payer email: "${payerEmail || 'N/A'}". Manual review required.`
    )
  }
}

/**
 * Handles 'invoice.payment_succeeded'.
 * Updates `paidUntil` and ensures status is 'active' for all students on a subscription.
 * Most importantly, it creates a permanent, auditable `StudentPayment` record for each student covered by the invoice.
 */
export async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as any // Using any to bypass TS errors on expanded props
  const subscriptionId = invoice.subscription
  const stripeInvoiceId = invoice.id

  if (!subscriptionId || !stripeInvoiceId) {
    console.log(
      `Invoice ${stripeInvoiceId} succeeded but is not tied to a subscription. Skipping payment record creation.`
    )
    return
  }

  const subscriptionLineItem = invoice.lines.data.find(
    (line: any) => line.type === 'subscription'
  )

  // We need the billing period to correctly assign the payment month/year.
  if (!subscriptionLineItem?.period) {
    console.error(
      `Error: Invoice ${stripeInvoiceId} is missing subscription line item or period info.`
    )
    return
  }

  // Find all students associated with this subscription.
  const students = await prisma.student.findMany({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (students.length === 0) {
    // Not an error, we might have subscriptions we don't track.
    return
  }

  const periodStart = new Date(subscriptionLineItem.period.start * 1000)
  const paidAt = invoice.paid_at ? new Date(invoice.paid_at * 1000) : new Date()

  // Calculate the amount paid per student for this invoice.
  const amountPerStudent =
    students.length > 0 ? invoice.total / students.length : 0

  // Create a payment record for each student on the subscription.
  const paymentData = students.map((student) => ({
    studentId: student.id,
    stripeInvoiceId: stripeInvoiceId,
    amountPaid: amountPerStudent, // Use the proportional amount from the invoice
    year: periodStart.getFullYear(),
    month: periodStart.getMonth() + 1, // JS months are 0-indexed
    paidAt: paidAt,
  }))

  const { count: createdCount } = await prisma.studentPayment.createMany({
    data: paymentData,
    skipDuplicates: true, // This is key for idempotency, based on our @@unique constraint.
  })

  if (createdCount > 0) {
    console.log(
      `Successfully created ${createdCount} payment record(s) for invoice ${stripeInvoiceId}.`
    )
  }

  // We still update the paidUntil status for the student record as before.
  const paidUntil = new Date(subscriptionLineItem.period.end * 1000)
  const { count: updatedCount } = await prisma.student.updateMany({
    where: { stripeSubscriptionId: subscriptionId as string },
    data: {
      subscriptionStatus: 'active',
      paidUntil: paidUntil,
    },
  })

  if (updatedCount > 0) {
    console.log(
      `Successfully updated ${updatedCount} student(s) paidUntil status for subscription ${subscriptionId}.`
    )
  }
}

/**
 * Handles 'invoice.payment_failed' event to add a late fee to the customer.
 * This function is solely responsible for creating a pending invoice item that will be
 * added to the customer's next invoice.
 * Student status changes are handled by `handleSubscriptionUpdated`.
 */
export async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer

  if (typeof customerId !== 'string') {
    console.log(
      `Invoice ${invoice.id} payment failed, but is missing customer ID. Cannot create late fee.`
    )
    return
  }

  // Check if a PENDING late fee already exists for this customer to prevent duplicates.
  const existingItems = await stripe.invoiceItems.list({
    customer: customerId,
    pending: true,
  })

  // Dynamically create a description for the late fee, e.g., "June 2025 Failed Payment Fee"
  const failedInvoiceMonth = new Date(invoice.created * 1000).toLocaleString(
    'default',
    { month: 'long', year: 'numeric' }
  )
  const dynamicDescription = `${failedInvoiceMonth} Failed Payment Fee`

  const hasLateFee = existingItems.data.some(
    (item: Stripe.InvoiceItem) => item.description === dynamicDescription
  )

  if (hasLateFee) {
    console.log(
      `Customer ${customerId} already has a pending late fee for ${failedInvoiceMonth}. Skipping creation.`
    )
    return
  }

  // Create a pending $10 late fee with the dynamic description.
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: 1000, // 1000 cents = $10.00
    currency: 'usd',
    description: dynamicDescription,
  })

  console.log(
    `Successfully created a pending late fee for customer ${customerId} for failed invoice from ${failedInvoiceMonth}.`
  )
}

/**
 * Handles 'customer.subscription.updated' events.
 * This is the primary handler for managing student status based on their subscription lifecycle.
 * It's the source of truth for `active`, `past_due`, and `unpaid` statuses.
 */
export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  // Find all students linked to this subscription
  const students = await prisma.student.findMany({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (students.length === 0) {
    // This is not an error, as Stripe may have subscriptions we don't track.
    return
  }

  // Update all found students to reflect the latest subscription status
  const { count } = await prisma.student.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { subscriptionStatus: subscription.status },
  })

  console.log(
    `Subscription ${subscription.id} updated. Matched and updated ${count} student(s) to status: ${subscription.status}`
  )
}

/**
 * Handles 'customer.subscription.deleted' events.
 * Marks the subscription as canceled for all students sharing it and removes the link.
 */
export async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  const { count } = await prisma.student.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null, // Unlink the subscription
      paidUntil: null, // Clear the paid until date
    },
  })

  if (count > 0) {
    console.log(
      `Subscription ${subscription.id} deleted. Unlinked and marked ${count} student(s) as canceled.`
    )
  }
}
