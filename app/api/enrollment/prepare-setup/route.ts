import { NextResponse } from 'next/server'

import { SubscriptionStatus } from '@prisma/client'
import type { Stripe } from 'stripe'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import {
  AppError,
  Errors,
  ValidationError,
  handleStripeError,
} from '@/lib/errors'
import { validateStudentForEnrollment } from '@/lib/queries/subscriptions'
import { prepareSetupSchema } from '@/lib/schemas/enrollment'
import { stripeServerClient } from '@/lib/stripe'
import { BASE_RATE } from '@/lib/types'

// const ACTIVE_SUBSCRIPTION_STATUSES = [
//   SubscriptionStatus.ACTIVE,
//   SubscriptionStatus.PAST_DUE,
// ]

// Helper function to check if object is a full Stripe Customer (not deleted)
function isFullCustomer(
  obj: Stripe.Customer | Stripe.DeletedCustomer
): obj is Stripe.Customer {
  return !('deleted' in obj && obj.deleted)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('💡 Request Body:', body)

    const data = prepareSetupSchema.parse(body)
    console.log('✅ Validated Data:', {
      email: data.payerDetails.email,
      studentIds: data.studentIds,
    })

    const result = await prisma.$transaction(async (tx) => {
      // Log student details
      const studentCheck = await tx.student.findFirst({
        where: { id: data.studentIds[0] },
        include: {
          payer: {
            include: {
              subscriptions: {
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      })
      console.log('👨‍🎓 Student Details:', {
        id: studentCheck?.id,
        name: studentCheck?.name,
        payerId: studentCheck?.payerId,
        payerEmail: studentCheck?.payer?.email,
        subscriptions: studentCheck?.payer?.subscriptions,
      })

      // Log ALL payer checks
      console.log('🔍 Starting Payer Checks...')

      const simplePayerCheck = await tx.payer.findFirst({
        where: { email: data.payerDetails.email },
        select: { id: true, email: true },
      })
      console.log('1️⃣ Simple Payer Check:', simplePayerCheck)

      const payerWithSubs = await tx.payer.findFirst({
        where: { email: data.payerDetails.email },
        include: {
          subscriptions: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
      })
      console.log('2️⃣ Payer with Subscriptions:', payerWithSubs)

      // Check for existing payer with active subscriptions
      const existingPayer = await tx.payer.findFirst({
        where: {
          email: data.payerDetails.email,
          subscriptions: {
            some: {
              status: SubscriptionStatus.ACTIVE,
            },
          },
        },
        include: {
          subscriptions: true,
          students: true,
        },
      })

      if (existingPayer) {
        throw new AppError(
          'Payer already has active subscriptions',
          'ACTIVE_SUBSCRIPTION_EXISTS',
          400
        )
      }

      // 3. Validate each student individually
      const validationPromises = data.studentIds.map((studentId) =>
        validateStudentForEnrollment(studentId)
      )
      const validationResults = await Promise.allSettled(validationPromises)

      // Check for validation failures
      const failures = validationResults.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )

      if (failures.length > 0) {
        throw new AppError(
          `Student validation failed: ${failures[0].reason.message}`,
          'STUDENT_VALIDATION_FAILED',
          400
        )
      }

      // Get validated students with their calculated rates
      const validatedStudents = validationResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<any>).value)

      // Calculate total monthly rate using validated rates
      const totalMonthlyRate = validatedStudents.reduce(
        (sum, { student }) => sum + student.monthlyRate,
        0
      )

      // Calculate total discount applied
      const totalDiscountApplied = validatedStudents.reduce(
        (sum, { student }) => sum + student.discountApplied,
        0
      )

      // Group students by family
      const siblingGroups = validatedStudents.reduce(
        (acc, { student }) => {
          if (student.siblingGroup) {
            if (!acc[student.siblingGroup.id]) {
              acc[student.siblingGroup.id] = []
            }
            acc[student.siblingGroup.id].push(student)
          }
          return acc
        },
        {} as Record<string, any[]>
      )

      // First check if a Stripe customer already exists with this email
      let customer
      try {
        console.log(
          '🔍 Checking for existing Stripe customer with email:',
          data.payerDetails.email
        )

        // Check if there's an existing payer in our database with this email
        const existingPayer = await tx.payer.findFirst({
          where: { email: data.payerDetails.email },
          select: { id: true, email: true, stripeCustomerId: true },
        })

        if (existingPayer?.stripeCustomerId) {
          console.log('📋 Found existing payer in database:', {
            id: existingPayer.id,
            email: existingPayer.email,
            stripeCustomerId: existingPayer.stripeCustomerId,
          })

          // Verify the customer still exists in Stripe
          try {
            customer = await stripeServerClient.customers.retrieve(
              existingPayer.stripeCustomerId
            )

            // Check if customer is deleted using our helper function
            if (!isFullCustomer(customer)) {
              console.log('Stripe customer exists but is deleted')
              customer = null // Will create new customer below
            } else {
              console.log('✅ Verified existing Stripe customer:', {
                id: customer.id,
                email: customer.email,
                name: customer.name,
              })

              // Update customer details
              customer = await stripeServerClient.customers.update(
                customer.id,
                {
                  name: `${data.payerDetails.firstName} ${data.payerDetails.lastName}`,
                  phone: data.payerDetails.phone,
                  metadata: {
                    ...customer.metadata,
                    relationship: data.payerDetails.relationship,
                    enrollmentPending: 'true',
                    totalStudents: data.studentIds.length.toString(),
                    totalMonthlyRate: totalMonthlyRate.toString(),
                    totalDiscountApplied: totalDiscountApplied.toString(),
                    hasFamilyDiscount: (totalDiscountApplied > 0).toString(),
                    lastAttemptedAt: new Date().toISOString(),
                  },
                }
              )
              console.log('🔄 Updated existing Stripe customer')
            }
          } catch (stripeError) {
            console.error(
              '❌ Error retrieving Stripe customer, will create new one:',
              stripeError
            )
            customer = null // Force creation of new customer
          }
        }

        // If no customer found in our database, check Stripe directly
        if (!customer) {
          const existingCustomers = await stripeServerClient.customers.list({
            email: data.payerDetails.email,
            limit: 1,
          })

          if (existingCustomers.data.length > 0) {
            const stripeCustomer = existingCustomers.data[0]
            console.log('🔍 Found existing Stripe customer via API:', {
              id: stripeCustomer.id,
              email: stripeCustomer.email,
              created: new Date(stripeCustomer.created * 1000).toISOString(),
            })

            // Check if this customer has any subscriptions
            const subscriptions = await stripeServerClient.subscriptions.list({
              customer: stripeCustomer.id,
              limit: 1,
            })

            if (subscriptions.data.length > 0) {
              console.log(
                '⚠️ Found existing subscriptions for this customer:',
                {
                  subscriptionId: subscriptions.data[0].id,
                  status: subscriptions.data[0].status,
                }
              )

              // Log this for further investigation
              console.log(
                '🚨 Customer has existing subscriptions but no payer record in database'
              )
            }

            // Update customer details
            customer = await stripeServerClient.customers.update(
              stripeCustomer.id,
              {
                name: `${data.payerDetails.firstName} ${data.payerDetails.lastName}`,
                phone: data.payerDetails.phone,
                metadata: {
                  ...stripeCustomer.metadata,
                  relationship: data.payerDetails.relationship,
                  enrollmentPending: 'true',
                  totalStudents: data.studentIds.length.toString(),
                  totalMonthlyRate: totalMonthlyRate.toString(),
                  totalDiscountApplied: totalDiscountApplied.toString(),
                  hasFamilyDiscount: (totalDiscountApplied > 0).toString(),
                  lastAttemptedAt: new Date().toISOString(),
                  previouslyOrphaned: 'true',
                },
              }
            )
            console.log('🔄 Updated existing Stripe customer from API search')
          } else {
            // Create new customer if none exists
            console.log('🆕 No existing customer found, creating new one')
            customer = await stripeServerClient.customers.create({
              name: `${data.payerDetails.firstName} ${data.payerDetails.lastName}`,
              email: data.payerDetails.email,
              phone: data.payerDetails.phone,
              metadata: {
                relationship: data.payerDetails.relationship,
                enrollmentPending: 'true',
                totalStudents: data.studentIds.length.toString(),
                totalMonthlyRate: totalMonthlyRate.toString(),
                totalDiscountApplied: totalDiscountApplied.toString(),
                hasFamilyDiscount: (totalDiscountApplied > 0).toString(),
                createdAt: new Date().toISOString(),
                source: 'autopay_enrollment',
              },
            })
            console.log('✅ Created new Stripe customer:', {
              id: customer.id,
              email: customer.email,
            })
          }
        }
      } catch (error) {
        console.error('❌ Error in customer lookup/creation:', error)
        throw error
      }

      // Create SetupIntent
      const setupIntent = await stripeServerClient.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['us_bank_account'],
        usage: 'off_session',
        metadata: {
          payerDetails: JSON.stringify(data.payerDetails),
          studentIds: JSON.stringify(data.studentIds),
          studentDetails: JSON.stringify(
            validatedStudents.map(({ student }) => ({
              id: student.id,
              name: student.name,
              rate: student.monthlyRate,
              originalRate: student.customRate
                ? student.monthlyRate
                : BASE_RATE,
              discountApplied: student.discountApplied,
              familyId: student.familyId,
              customRateApplied: student.hasCustomRate,
            }))
          ),
          totalStudents: data.studentIds.length.toString(),
          totalMonthlyRate: totalMonthlyRate.toString(),
          totalDiscountApplied: totalDiscountApplied.toString(),
          hasFamilyDiscount: (totalDiscountApplied > 0).toString(),
          siblingGroupCount: Object.keys(siblingGroups).length.toString(),
          createdAt: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        },
        payment_method_options: {
          us_bank_account: {
            verification_method: 'automatic',
            financial_connections: {
              permissions: ['payment_method'],
            },
          },
        },
      })

      return {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        customerId: customer.id,
        isExistingCustomer: false,
        status: setupIntent.status,
        paymentMethodTypes: setupIntent.payment_method_types,
        totalMonthlyRate,
        totalDiscountApplied,
        siblingGroupCount: Object.keys(siblingGroups).length,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: 'New customer setup prepared',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Setup preparation failed:', error)

    if (error instanceof z.ZodError) {
      const validationError = new ValidationError('Invalid enrollment data')
      return NextResponse.json(
        {
          success: false,
          code: validationError.code,
          errors: error.errors,
        },
        { status: validationError.statusCode }
      )
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      )
    }

    if (error instanceof stripeServerClient.errors.StripeError) {
      const stripeError = handleStripeError(error)
      return NextResponse.json(
        {
          success: false,
          code: stripeError.code,
          message: stripeError.message,
        },
        { status: stripeError.statusCode }
      )
    }

    const genericError = Errors.enrollment()
    return NextResponse.json(
      {
        success: false,
        code: genericError.code,
        message: genericError.message,
        timestamp: new Date().toISOString(),
      },
      { status: genericError.statusCode }
    )
  }
}
